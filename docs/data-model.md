# AOIFMSP Data Model and Storage Schema

## Purpose

This document defines the MVP persistence model for AOIFMSP across Azure Table Storage, Blob Storage, Queue Storage, and Key Vault. It is designed to support:

- Low-cost, serverless operation
- Strong logical tenant isolation
- Fast list and lookup queries for the UI
- Immutable published workflow artifacts
- Queue-driven execution with replay and retry support
- AI-assisted design and governed AI agent execution steps
- Direct MSP-centric tenant and user management built on the same action layer as workflows

## Storage Strategy

AOIFMSP uses a split-storage model:

- Azure Table Storage for indexed metadata, lists, summaries, and small records
- Azure Blob Storage for large JSON documents, OpenAPI files, generated artifacts, and execution payloads
- Azure Queue Storage for execution and trigger work items
- Azure Key Vault for secrets, tokens, certificates, and credential material
- Microsoft Entra-based auth and managed identities should be the default access mode for platform-owned Azure resources where supported
- Azure AI Foundry Agent Service for agent runtime state, threads, traces, and retrieval state

Important boundary:

- AOIFMSP remains the system of record for workflow metadata, approvals, and execution summaries.
- Foundry owns agent runtime state such as threads, traces, and retrieval assets.
- AOIFMSP stores references to Foundry projects, agents, threads, and runs rather than duplicating complete conversation histories.
- Customer-tenant management should default to GDAP-backed delegated/OBO access rather than broad app-only customer-local Graph permissions.

Recommended default:

- Use Foundry basic setup for MVP and for most MSPs.

Clean upgrade path:

- Support standard bring-your-own-resources Foundry setup for MSPs that require customer-owned Storage, Cosmos DB, AI Search, or tighter network and governance controls.

Production posture:

- Use private connectivity and policy-enforced resource configuration where supported.
- Disallow insecure Storage auth patterns and document exceptions.
- Treat Foundry basic setup as an explicit reviewed choice, not an unconditional production default.

## General Conventions

### ID Format

Use ULIDs for most platform-generated identifiers because they are unique, sortable, and compact.

Examples:

- `msp_01JQ...`
- `client_01JQ...`
- `conn_01JQ...`
- `wf_01JQ...`
- `exec_01JQ...`
- `agent_01JQ...`
- `airun_01JQ...`

External tenant identifiers such as Microsoft Entra tenant IDs remain in their native GUID format.

### Timestamps

Store timestamps in UTC ISO 8601 format in domain properties.

Examples:

- `createdAt`
- `updatedAt`
- `publishedAt`
- `startedAt`
- `completedAt`

Azure Table `Timestamp` is retained as the storage-managed concurrency field, but application logic should use explicit domain timestamps as well.

### Common Metadata Fields

Most entities should include these fields in addition to table keys:

- `id`
- `mspTenantId`
- `clientTenantId` when applicable
- `displayName`
- `status`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `tagsJson` as a JSON string when lightweight tagging is needed
- `schemaVersion`
- `managementMode` when an entity needs to distinguish direct UI management, workflow automation, or mixed use

### Table Storage Limits

Because Azure Table Storage has limited indexing and property constraints, AOIFMSP should follow these rules:

- Store only query-friendly metadata in tables.
- Store large schemas, workflow graphs, step payloads, and OpenAPI content in Blob Storage.
- Store JSON in tables only when it is small and not a primary query target.
- Add denormalized summary fields where the UI needs list views without joins.
- Store AI run summaries and Foundry references in tables, not full threads or long traces.
- Treat security-relevant access methods such as Shared Key or public anonymous access as disabled-by-default for production data stores.


## Production Security Control Notes

The storage schema in this document assumes these production controls:

- Azure Storage uses Microsoft Entra auth where supported and Shared Key is disallowed unless an exception is documented
- Sensitive containers and operational data are not publicly accessible
- Key Vault uses soft delete, purge protection, diagnostics, and private or tightly restricted network access
- OBO refresh tokens and equivalent secure materials remain only in Key Vault or equivalent secure stores
- Foundry setup mode is selected through a documented security review
## Table Storage Schema

## Table: `MspTenants`

Purpose: one record per MSP tenant using the platform.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = PROFILE`

Fields:

- `id`
- `m365TenantId`
- `displayName`
- `primaryDomain`
- `status`
- `billingState`
- `defaultRegion`
- `settingsBlobPath`
- `preferredFoundrySetupMode`
- `gdapRelationshipState`
- `defaultAdminAuthMode`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `schemaVersion`

Notes:

- Tenant-wide settings that may grow should live in Blob Storage and be referenced through `settingsBlobPath`.
- `preferredFoundrySetupMode` should default to `basic` only until a production security review sets the approved mode for that MSP environment.
- `gdapRelationshipState` should reflect the current customer relationship lifecycle.
- `defaultAdminAuthMode` should default to `gdap-obo` for customer management operations.
- Production OBO scenarios should reference a dedicated service-account pattern with MFA-compliant enrollment and token-handling procedures.

## Table: `MspUsers`

Purpose: role assignments for users in an MSP tenant.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = USER#{userObjectId}`

Fields:

- `id`
- `mspTenantId`
- `userObjectId`
- `userPrincipalName`
- `displayName`
- `rolesCsv`
- `status`
- `lastLoginAt`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- Source-of-truth identity stays in Microsoft Entra ID.
- This table stores AOIFMSP role bindings and local user state only.


## Table: `UserPreferences`

Purpose: per-user UI preferences, layout state, onboarding progression, and input customizations.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = PREF#{userObjectId}`

Fields:

- `mspTenantId`
- `userObjectId`
- `themeMode`
- `densityMode`
- `preferredStartSurface`
- `layoutPreferencesJson`
- `commandPaletteHistoryJson`
- `onboardingProgressJson`
- `featureExposureMode`
- `updatedAt`

Notes:

- `featureExposureMode` can support progressive disclosure modes such as `guided`, `standard`, or `advanced`.
- Keep only lightweight preference data here. Larger per-user workspace state can live in Blob Storage if needed.

## Table: `UserInputProfiles`

Purpose: per-user input action maps and custom bindings.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|USER#{userObjectId}`
- `RowKey = INPUT#{profileId}`

Fields:

- `mspTenantId`
- `userObjectId`
- `profileId`
- `displayName`
- `surfaceScope`
- `isDefault`
- `bindingMapJson`
- `version`
- `updatedAt`

Notes:

- `surfaceScope` can be `global`, `workflow-designer`, `tenant-admin`, or similar.
- `bindingMapJson` should store action-to-input mappings, not raw component-level event wiring.

## Table: `ClientTenants`

Purpose: client tenant registry under an MSP.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = CLIENT#{clientTenantId}`

Fields:

- `id`
- `mspTenantId`
- `clientTenantId`
- `clientM365TenantId`
- `displayName`
- `primaryDomain`
- `status`
- `onboardingState`
- `graphConnectionId`
- `defaultUsageLocation`
- `notesBlobPath`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- `clientTenantId` is the AOIFMSP ID.
- `clientM365TenantId` is the Microsoft Entra tenant GUID.

## Table: `ClientAppRegistrations`

Purpose: metadata for client-tenant app registrations and granted Graph access.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|CLIENT#{clientTenantId}`
- `RowKey = APPREG#{appRegistrationId}`

Fields:

- `id`
- `mspTenantId`
- `clientTenantId`
- `displayName`
- `appId`
- `servicePrincipalObjectId`
- `tenantId`
- `authMode`
- `credentialType`
- `credentialSecretRef`
- `certificateThumbprint`
- `consentState`
- `permissionsJson`
- `lastValidatedAt`
- `status`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- `credentialSecretRef` points to Key Vault and never stores raw credential material.
- High-value app credentials should carry expiration, rotation, and review expectations in operational policy.
- `permissionsJson` is expected to be small. Larger permission diagnostics should go to Blob Storage.

## Table: `FoundryProjects`

Purpose: per-MSP configuration of Azure AI Foundry project endpoints and setup mode.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = FOUNDRY#{environmentName}`

Fields:

- `id`
- `mspTenantId`
- `environmentName`
- `displayName`
- `foundryProjectEndpoint`
- `foundryProjectName`
- `foundryProjectResourceId`
- `defaultModelDeployment`
- `setupMode`
- `status`
- `appInsightsResourceId`
- `storageResourceId`
- `cosmosResourceId`
- `searchResourceId`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- `setupMode` should be `basic` or `standard`.
- `basic` is the default for MVP and most MSPs.
- Resource IDs for Storage, Cosmos DB, and AI Search are optional for `basic` and expected for `standard`.


## Table: `TenantManagementProfiles`

Purpose: per-client-tenant management posture, GDAP state, and platform app references.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = MGMT#{clientTenantId}`

Fields:

- `id`
- `mspTenantId`
- `clientTenantId`
- `gdapRelationshipState`
- `gdapRolesJson`
- `gdapExpiresAt`
- `defaultAdminAuthMode`
- `oboServiceAccountRef`
- `platformAppRegistrationId`
- `platformPermissionScopeJson`
- `managementCapabilitiesJson`
- `lastValidatedAt`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- `defaultAdminAuthMode` should typically be `gdap-obo`.
- `platformAppRegistrationId` is for AOIFMSP platform-specific customer-tenant capabilities, not assumed broad admin access.
- `managementCapabilitiesJson` can summarize which built-in tenant and user management features are available under the current GDAP and consent posture.

## Table: `ManagedUsers`

Purpose: cached user summaries per customer tenant for faster MSP search, list, and management experiences.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|CLIENT#{clientTenantId}`
- `RowKey = USER#{managedUserId}`

Fields:

- `id`
- `mspTenantId`
- `clientTenantId`
- `managedUserId`
- `entraObjectId`
- `userPrincipalName`
- `displayName`
- `givenName`
- `surname`
- `mail`
- `accountEnabled`
- `usageLocation`
- `userType`
- `licenseSummaryJson`
- `roleSummaryJson`
- `groupSummaryJson`
- `syncSource`
- `lastGraphSyncAt`
- `lastManagedAt`
- `status`

Notes:

- Microsoft Graph remains the source of truth.
- This table is a cached summary surface for efficient MSP UX and workflow picker experiences.
- Large or rarely used profile details should be fetched live or stored in Blob snapshots if needed.


## Table: `Tickets`

Purpose: cached PSA ticket summaries for the technician workspace.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = TICKET#{ticketId}`

Fields:

- `id`
- `mspTenantId`
- `ticketId`
- `sourceSystem`
- `sourceTicketId`
- `boardOrQueue`
- `status`
- `priority`
- `displayName`
- `clientTenantId`
- `relatedUserId`
- `relatedDeviceId`
- `assignedTechnicianId`
- `summary`
- `lastSourceUpdatedAt`
- `lastSyncedAt`
- `sourceUrl`

Notes:

- PSA remains the source of truth.
- This table stores searchable technician-facing ticket summaries and relationship hooks.

## Table: `Devices`

Purpose: cached RMM device summaries for the technician workspace.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|CLIENT#{clientTenantId}`
- `RowKey = DEVICE#{deviceId}`

Fields:

- `id`
- `mspTenantId`
- `clientTenantId`
- `deviceId`
- `sourceSystem`
- `sourceDeviceId`
- `displayName`
- `deviceType`
- `platform`
- `status`
- `lastSeenAt`
- `primaryUserId`
- `ticketCount`
- `alertCount`
- `summary`
- `lastSourceUpdatedAt`
- `lastSyncedAt`
- `sourceUrl`

Notes:

- RMM remains the source of truth.
- This table supports quick search, list, and relationship context in AOIFMSP.

## Table: `DocumentationRecords`

Purpose: cached documentation summaries and links for technician workflows.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|CLIENT#{clientTenantId}`
- `RowKey = DOC#{documentationRecordId}`

Fields:

- `id`
- `mspTenantId`
- `clientTenantId`
- `documentationRecordId`
- `sourceSystem`
- `sourceRecordId`
- `displayName`
- `category`
- `relatedUserId`
- `relatedDeviceId`
- `relatedTicketId`
- `summary`
- `lastSourceUpdatedAt`
- `lastSyncedAt`
- `sourceUrl`

Notes:

- Documentation platforms remain the source of truth.
- AOIFMSP stores only lightweight summaries and relationship metadata for technician context.

## Table: `TechnicianContextLinks`

Purpose: normalized cross-tool relationships between tickets, tenants, users, devices, docs, alerts, and workflows.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|CTX#{contextType}#{contextId}`
- `RowKey = LINK#{linkedType}#{linkedId}`

Fields:

- `mspTenantId`
- `contextType`
- `contextId`
- `linkedType`
- `linkedId`
- `relationshipType`
- `sourceSystem`
- `confidence`
- `updatedAt`

Notes:

- This provides the relationship index that powers contextual side panels and quick jumps.
- It is intentionally lightweight and does not replace authoritative source-system data.
## Table: `TenantGroups`

Purpose: MSP-defined groupings of customer tenants for scoping standards, alerts, and bulk operations.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = TGROUP#{tenantGroupId}`

Fields:

- `id`
- `mspTenantId`
- `displayName`
- `description`
- `membershipMode`
- `criteriaJson`
- `status`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- `membershipMode` can be `static` or `rule-based`.
- Rule-based groups should be evaluated asynchronously and summarized for UI performance.

## Table: `TenantGroupMembers`

Purpose: resolved membership rows for tenant groups.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|TGROUP#{tenantGroupId}`
- `RowKey = CLIENT#{clientTenantId}`

Fields:

- `mspTenantId`
- `tenantGroupId`
- `clientTenantId`
- `membershipSource`
- `resolvedAt`

## Table: `StandardsTemplates`

Purpose: reusable MSP-defined standards and baseline policies.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = STANDARD#{standardId}`

Fields:

- `id`
- `mspTenantId`
- `displayName`
- `description`
- `category`
- `definitionBlobPath`
- `defaultSeverity`
- `remediationMode`
- `status`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- Standards definitions can reference Graph-based management checks, connector actions, or workflow-backed evaluations.

## Table: `StandardsAssignments`

Purpose: assignment of standards to specific tenants or tenant groups.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|STANDARD#{standardId}`
- `RowKey = ASSIGN#{assignmentId}`

Fields:

- `id`
- `mspTenantId`
- `standardId`
- `targetType`
- `targetId`
- `status`
- `overrideJson`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- `targetType` can be `tenant` or `tenant-group`.

## Table: `StandardsResults`

Purpose: latest evaluated standards state per tenant.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|CLIENT#{clientTenantId}`
- `RowKey = STANDARD#{standardId}`

Fields:

- `mspTenantId`
- `clientTenantId`
- `standardId`
- `status`
- `severity`
- `resultSummary`
- `resultBlobPath`
- `lastEvaluatedAt`
- `lastRemediatedAt`
- `excluded`

## Table: `ManagementAlerts`

Purpose: tenant-management and standards alerts surfaced to MSP operators.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = ALERT#{reverseTicks}#{alertId}`

Fields:

- `id`
- `mspTenantId`
- `clientTenantId`
- `alertType`
- `severity`
- `sourceType`
- `sourceId`
- `title`
- `summary`
- `status`
- `assignedTo`
- `detailsBlobPath`
- `createdAt`
- `updatedAt`
- `resolvedAt`

## Table: `ManagementSyncState`

Purpose: freshness and sync status for cached management datasets.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|CLIENT#{clientTenantId}`
- `RowKey = SYNC#{datasetName}`

Fields:

- `mspTenantId`
- `clientTenantId`
- `datasetName`
- `lastSuccessfulSyncAt`
- `lastAttemptedSyncAt`
- `status`
- `recordCount`
- `cursorJson`
- `errorSummary`
- `updatedAt`

Notes:

- Typical datasets include `users`, `licenses`, `groups`, `roles`, and `standards`.
## Table: `Connectors`

Purpose: connector catalog metadata owned by an MSP.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = CONNECTOR#{connectorId}`

Fields:

- `id`
- `mspTenantId`
- `displayName`
- `providerName`
- `category`
- `sourceType`
- `defaultAuthType`
- `latestVersion`
- `status`
- `visibility`
- `iconBlobPath`
- `summary`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- `sourceType` can be values such as `openapi-upload`, `openapi-url`, or `manual-adapter`.
- Connectors are listed often, so this record should stay small and UI-oriented.

## Table: `ConnectorVersions`

Purpose: immutable metadata for each imported connector version.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|CONNECTOR#{connectorId}`
- `RowKey = VER#{connectorVersionId}`

Fields:

- `id`
- `mspTenantId`
- `connectorId`
- `connectorVersionId`
- `versionLabel`
- `status`
- `importSource`
- `openApiBlobPath`
- `artifactBlobPath`
- `actionsCount`
- `schemasCount`
- `authSchemesJson`
- `hashSha256`
- `importedAt`
- `importedBy`
- `publishedAt`
- `schemaVersion`
- `managementMode` when an entity needs to distinguish direct UI management, workflow automation, or mixed use

Notes:

- Full generated action definitions belong in Blob Storage under `artifactBlobPath`.
- This record is the lookup surface for versions and compatibility checks.

## Table: `ConnectorActions`

Purpose: searchable action summaries for a connector version.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|CONNECTOR#{connectorId}|VER#{connectorVersionId}`
- `RowKey = ACTION#{actionId}`

Fields:

- `id`
- `mspTenantId`
- `connectorId`
- `connectorVersionId`
- `actionId`
- `operationId`
- `displayName`
- `category`
- `method`
- `pathTemplate`
- `inputSchemaRef`
- `outputSchemaRef`
- `authRequirement`
- `isTriggerCapable`
- `isDeprecated`
- `summary`

Notes:

- This table exists for picker and search UX.
- Full action schema details remain in Blob Storage.

## Table: `AIAgents`

Purpose: AOIFMSP catalog of design-time and runtime agents.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = AGENT#{agentId}`

Fields:

- `id`
- `mspTenantId`
- `displayName`
- `agentType`
- `purpose`
- `foundryProjectRef`
- `foundryAgentId`
- `defaultModelDeployment`
- `latestVersionId`
- `instructionBlobPath`
- `toolPolicyBlobPath`
- `outputSchemaJson`
- `approvalMode`
- `status`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- `agentType` should distinguish `design` and `runtime` agents.
- `approvalMode` should default to `suggest-only` unless an MSP intentionally enables more capable modes.

## Table: `AIAgentVersions`

Purpose: immutable prompt and policy versions for agents.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|AGENT#{agentId}`
- `RowKey = VER#{agentVersionId}`

Fields:

- `id`
- `mspTenantId`
- `agentId`
- `agentVersionId`
- `versionLabel`
- `foundryAgentId`
- `modelDeploymentName`
- `instructionBlobPath`
- `toolDefinitionBlobPath`
- `outputSchemaJson`
- `safetyPolicyJson`
- `evaluationPolicyJson`
- `publishedAt`
- `publishedBy`
- `status`

Notes:

- Version records should be immutable after publication.
- Prompt text and larger tool definitions belong in Blob Storage.

## Table: `Connections`

Purpose: authenticated connection instances bound to MSP or client scope.

Partition strategy:

- MSP-scoped connection: `PartitionKey = MSP#{mspTenantId}`
- Client-scoped connection: `PartitionKey = MSP#{mspTenantId}|CLIENT#{clientTenantId}`
- `RowKey = CONNECTION#{connectionId}`

Fields:

- `id`
- `mspTenantId`
- `clientTenantId`
- `scopeType`
- `connectorId`
- `connectorVersionId`
- `displayName`
- `authType`
- `secretRef`
- `baseUrlOverride`
- `status`
- `healthStatus`
- `lastTestedAt`
- `lastTokenRefreshAt`
- `capabilitiesJson`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- `scopeType` should be `msp` or `client`.
- `secretRef` points to Key Vault.
- Graph connections for client tenants are just specialized rows in this table.

## Table: `Workflows`

Purpose: mutable workflow metadata and draft pointer.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = WORKFLOW#{workflowId}`

Fields:

- `id`
- `mspTenantId`
- `displayName`
- `description`
- `status`
- `draftBlobPath`
- `publishedVersionId`
- `publishedVersionLabel`
- `defaultClientTenantId`
- `triggerModeSummary`
- `designAssistantMode`
- `lastPublishedAt`
- `lastRunAt`
- `lastRunStatus`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- The draft graph is stored as JSON in Blob Storage and referenced by `draftBlobPath`.
- This table is optimized for workflow list screens.
- `designAssistantMode` can indicate whether the current draft is manual, AI-assisted, or mixed.
- Built-in management flows can reference these same workflow/action artifacts without requiring a published workflow for every admin task.

## Table: `WorkflowVersions`

Purpose: immutable published workflow versions.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|WORKFLOW#{workflowId}`
- `RowKey = VER#{workflowVersionId}`

Fields:

- `id`
- `mspTenantId`
- `workflowId`
- `workflowVersionId`
- `versionLabel`
- `status`
- `artifactBlobPath`
- `manifestJson`
- `triggerConfigHash`
- `connectionBindingsJson`
- `publishedAt`
- `publishedBy`
- `sourceDraftHash`
- `schemaVersion`
- `managementMode` when an entity needs to distinguish direct UI management, workflow automation, or mixed use

Notes:

- `manifestJson` should stay small and contain summary metadata only.
- `artifactBlobPath` points to the immutable published workflow package.

## Table: `WorkflowTriggers`

Purpose: trigger definitions attached to workflow versions or workflow defaults.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|WORKFLOW#{workflowId}`
- `RowKey = TRIGGER#{triggerId}`

Fields:

- `id`
- `mspTenantId`
- `workflowId`
- `workflowVersionId`
- `triggerType`
- `displayName`
- `status`
- `scheduleCron`
- `webhookPath`
- `pollingConnectionId`
- `pollingCursorBlobPath`
- `configJson`
- `lastFiredAt`
- `lastSucceededAt`
- `lastFailedAt`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

Notes:

- Keep webhook and schedule metadata lightweight here.
- Polling state that changes frequently should be separated from the static trigger record.

## Table: `PollingCheckpoints`

Purpose: mutable cursor state for polling triggers.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|TRIGGER#{triggerId}`
- `RowKey = STATE`

Fields:

- `mspTenantId`
- `workflowId`
- `triggerId`
- `cursorJson`
- `leaseOwner`
- `leaseExpiresAt`
- `lastPollStartedAt`
- `lastPollCompletedAt`
- `lastResultCount`
- `updatedAt`

Notes:

- If `cursorJson` becomes large, move it to Blob Storage and store only a blob pointer here.

## Table: `Executions`

Purpose: execution summary records for workflow runs.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}|WORKFLOW#{workflowId}`
- `RowKey = RUN#{reverseTicks}#{executionId}`

Fields:

- `id`
- `executionId`
- `mspTenantId`
- `workflowId`
- `workflowVersionId`
- `clientTenantId`
- `triggerId`
- `triggerType`
- `status`
- `startedAt`
- `completedAt`
- `durationMs`
- `currentStepCount`
- `successStepCount`
- `failedStepCount`
- `retryCount`
- `correlationId`
- `inputBlobPath`
- `outputBlobPath`
- `logBlobPath`
- `errorSummary`
- `startedByType`
- `startedById`

Notes:

- `reverseTicks` gives newest-first ordering for execution history.
- Large inputs, outputs, and logs belong in Blob Storage.

## Table: `ExecutionSteps`

Purpose: step-level execution status for troubleshooting and live run views.

Partition strategy:

- `PartitionKey = EXEC#{executionId}`
- `RowKey = STEP#{stepIndexPadded}#{attemptPadded}`

Fields:

- `executionId`
- `stepId`
- `stepIndex`
- `attempt`
- `nodeType`
- `nodeLabel`
- `status`
- `startedAt`
- `completedAt`
- `durationMs`
- `connectionId`
- `actionId`
- `agentId`
- `agentVersionId`
- `foundryRunId`
- `inputBlobPath`
- `outputBlobPath`
- `errorBlobPath`
- `retryable`
- `correlationId`

Notes:

- Keep step rows small enough for timeline and diagnostics screens.
- Full request and response bodies must be stored in Blob Storage.
- Agent-backed steps should store only Foundry references and summaries here.

## Table: `AIAgentRuns`

Purpose: summarized agent invocations from design-time sessions and workflow executions.

Partition strategy:

- Workflow-linked run: `PartitionKey = MSP#{mspTenantId}|WORKFLOW#{workflowId}`
- Design-only run: `PartitionKey = MSP#{mspTenantId}|DESIGN`
- `RowKey = AIRUN#{reverseTicks}#{aiAgentRunId}`

Fields:

- `id`
- `aiAgentRunId`
- `mspTenantId`
- `workflowId`
- `workflowVersionId`
- `executionId`
- `executionStepId`
- `agentId`
- `agentVersionId`
- `foundryProjectRef`
- `foundryAgentId`
- `foundryThreadId`
- `foundryRunId`
- `traceId`
- `modelDeploymentName`
- `operatingMode`
- `status`
- `toolCallsCount`
- `approvalState`
- `inputBlobPath`
- `outputBlobPath`
- `traceSummaryBlobPath`
- `startedAt`
- `completedAt`
- `durationMs`
- `startedByType`
- `startedById`

Notes:

- This table stores summaries and correlations only.
- Full conversations and tool traces remain in Foundry tracing and storage.

## Table: `AuditEvents`

Purpose: auditable change history and sensitive operations log.

Partition strategy:

- `PartitionKey = MSP#{mspTenantId}`
- `RowKey = AUDIT#{reverseTicks}#{auditEventId}`

Fields:

- `id`
- `mspTenantId`
- `clientTenantId`
- `actorType`
- `actorId`
- `actorDisplayName`
- `actionType`
- `resourceType`
- `resourceId`
- `resourceDisplayName`
- `result`
- `ipAddress`
- `userAgent`
- `correlationId`
- `summary`
- `detailsBlobPath`
- `occurredAt`

Notes:

- Use `detailsBlobPath` for larger before-and-after payloads or permission diffs.
- Include agent-definition, agent-version, and approval details for AI-related operations.

## Blob Storage Schema

Use separate containers to avoid mixing data lifecycles.

## Container: `connector-specs`

Purpose: raw imported OpenAPI and supporting source files.

Path pattern:

- `{mspTenantId}/{connectorId}/{connectorVersionId}/openapi.json`
- `{mspTenantId}/{connectorId}/{connectorVersionId}/source-metadata.json`

## Container: `connector-artifacts`

Purpose: generated connector artifacts and normalized schemas.

Path pattern:

- `{mspTenantId}/{connectorId}/{connectorVersionId}/actions.json`
- `{mspTenantId}/{connectorId}/{connectorVersionId}/schemas.json`
- `{mspTenantId}/{connectorId}/{connectorVersionId}/manifest.json`

Recommended contents:

- Full action definitions
- Input and output schema maps
- Auth mapping configuration
- Pagination adapters
- Import warnings

## Container: `ai-agent-definitions`

Purpose: AOIFMSP-owned prompt, policy, and evaluation assets.

Path pattern:

- `{mspTenantId}/{agentId}/{agentVersionId}/instructions.md`
- `{mspTenantId}/{agentId}/{agentVersionId}/tools.json`
- `{mspTenantId}/{agentId}/{agentVersionId}/evaluation-policy.json`

## Container: `ai-agent-runs`

Purpose: AOIFMSP summaries of prompts, structured outputs, and diagnostics.

Path pattern:

- `{mspTenantId}/{agentId}/{aiAgentRunId}/input.json`
- `{mspTenantId}/{agentId}/{aiAgentRunId}/output.json`
- `{mspTenantId}/{agentId}/{aiAgentRunId}/trace-summary.json`


## Container: `management-snapshots`

Purpose: optional larger tenant and user management snapshots and bulk-operation payloads.

Path pattern:

- `{mspTenantId}/{clientTenantId}/users/full-sync-{timestamp}.json`
- `{mspTenantId}/{clientTenantId}/management-ops/{operationId}/request.json`
- `{mspTenantId}/{clientTenantId}/management-ops/{operationId}/result.json`


## Container: `technician-context`

Purpose: larger technician workspace payloads, enriched ticket context, and source-system snapshots when needed.

Path pattern:

- `{mspTenantId}/tickets/{ticketId}/context.json`
- `{mspTenantId}/clients/{clientTenantId}/devices/{deviceId}/context.json`
- `{mspTenantId}/clients/{clientTenantId}/docs/{documentationRecordId}/context.json`

## Container: `standards-artifacts`

Purpose: standards definitions, evaluation outputs, and remediation artifacts.

Path pattern:

- `{mspTenantId}/{standardId}/definition.json`
- `{mspTenantId}/{clientTenantId}/{standardId}/result.json`
- `{mspTenantId}/{clientTenantId}/{standardId}/remediation.json`

## Container: `management-alerts`

Purpose: larger management alert details and evidence.

Path pattern:

- `{mspTenantId}/{alertId}/details.json`

## Container: `workflow-drafts`

Purpose: mutable workflow drafts.

Path pattern:

- `{mspTenantId}/{workflowId}/draft.json`
- `{mspTenantId}/{workflowId}/draft-layout.json`

Recommended contents:

- Graph nodes and edges
- Block configuration
- Editor layout state
- Draft-only notes
- AI draft provenance and assumptions where helpful

## Container: `workflow-versions`

Purpose: immutable published workflow artifacts.

Path pattern:

- `{mspTenantId}/{workflowId}/{workflowVersionId}/workflow.json`
- `{mspTenantId}/{workflowId}/{workflowVersionId}/manifest.json`
- `{mspTenantId}/{workflowId}/{workflowVersionId}/bindings.json`

Recommended contents:

- Frozen executable workflow graph
- Trigger settings snapshot
- Connection binding snapshot
- Publish-time validation results

## Container: `execution-data`

Purpose: execution payloads, logs, and diagnostics.

Path pattern:

- `{mspTenantId}/{workflowId}/{executionId}/input.json`
- `{mspTenantId}/{workflowId}/{executionId}/output.json`
- `{mspTenantId}/{workflowId}/{executionId}/logs.ndjson`
- `{mspTenantId}/{workflowId}/{executionId}/steps/{stepIndex}-{attempt}-input.json`
- `{mspTenantId}/{workflowId}/{executionId}/steps/{stepIndex}-{attempt}-output.json`
- `{mspTenantId}/{workflowId}/{executionId}/steps/{stepIndex}-{attempt}-error.json`

## Container: `audit-details`

Purpose: larger audit payloads.

Path pattern:

- `{mspTenantId}/{auditEventId}/details.json`

## Container: `tenant-data`

Purpose: tenant-scoped supplemental documents.

Path pattern:

- `{mspTenantId}/settings.json`
- `{mspTenantId}/clients/{clientTenantId}/notes.json`

## Queue Storage Schema

Queue messages should remain compact. If the payload may exceed safe queue size, store the body in Blob Storage and pass a `blobPath` reference.

## Queue: `workflow-start`

Purpose: start a workflow execution.

Message shape:

```json
{
  "messageType": "workflow-start",
  "executionId": "exec_01...",
  "mspTenantId": "msp_01...",
  "workflowId": "wf_01...",
  "workflowVersionId": "wfv_01...",
  "clientTenantId": "client_01...",
  "triggerId": "trg_01...",
  "triggerType": "manual",
  "correlationId": "corr_01...",
  "inputBlobPath": "execution-data/.../input.json",
  "enqueuedAt": "2026-03-12T16:00:00Z"
}
```

## Queue: `workflow-step`

Purpose: continue or fan out workflow execution.

Message shape:

```json
{
  "messageType": "workflow-step",
  "executionId": "exec_01...",
  "stepId": "step_01...",
  "stepIndex": 3,
  "attempt": 1,
  "mspTenantId": "msp_01...",
  "workflowId": "wf_01...",
  "workflowVersionId": "wfv_01...",
  "clientTenantId": "client_01...",
  "correlationId": "corr_01...",
  "resumeFromNodeId": "node_17",
  "contextBlobPath": "execution-data/.../context-step-3.json",
  "enqueuedAt": "2026-03-12T16:00:03Z"
}
```

## Queue: `ai-agent-step`

Purpose: asynchronous execution or resumption of an `ai-agent` workflow node.

Message shape:

```json
{
  "messageType": "ai-agent-step",
  "aiAgentRunId": "airun_01...",
  "executionId": "exec_01...",
  "executionStepId": "step_01...",
  "mspTenantId": "msp_01...",
  "workflowId": "wf_01...",
  "workflowVersionId": "wfv_01...",
  "clientTenantId": "client_01...",
  "agentId": "agent_01...",
  "agentVersionId": "aver_01...",
  "foundryProjectRef": "prod",
  "correlationId": "corr_01...",
  "inputBlobPath": "ai-agent-runs/.../input.json",
  "enqueuedAt": "2026-03-12T16:00:04Z"
}
```


## Queue: `management-operation`

Purpose: asynchronous tenant and user management operations initiated from the UI or from workflows.

Message shape:

```json
{
  "messageType": "management-operation",
  "operationId": "mgmtop_01...",
  "mspTenantId": "msp_01...",
  "clientTenantId": "client_01...",
  "operationType": "user-disable",
  "authMode": "gdap-obo",
  "connectionId": "conn_01...",
  "requestedByType": "user-or-workflow",
  "requestedById": "user_01...",
  "requestBlobPath": "management-snapshots/.../request.json",
  "correlationId": "corr_01...",
  "enqueuedAt": "2026-03-12T16:00:05Z"
}
```


## Queue: `technician-context-refresh`

Purpose: refresh ticket, device, or documentation context from source systems.

Message shape:

```json
{
  "messageType": "technician-context-refresh",
  "mspTenantId": "msp_01...",
  "contextType": "ticket",
  "contextId": "ticket_01...",
  "sourceSystem": "psa",
  "requestedByType": "user-or-system",
  "requestedById": "user_01...",
  "correlationId": "corr_01...",
  "enqueuedAt": "2026-03-12T16:00:08Z"
}
```
## Queue: `directory-sync-refresh`

Purpose: refresh cached tenant-management datasets such as users, groups, or licenses.

Message shape:

```json
{
  "messageType": "directory-sync-refresh",
  "mspTenantId": "msp_01...",
  "clientTenantId": "client_01...",
  "datasetName": "users",
  "authMode": "gdap-obo",
  "requestedByType": "user-or-system",
  "requestedById": "user_01...",
  "correlationId": "corr_01...",
  "enqueuedAt": "2026-03-12T16:00:06Z"
}
```

## Queue: `standards-evaluation`

Purpose: evaluate one or more standards for a tenant or tenant group.

Message shape:

```json
{
  "messageType": "standards-evaluation",
  "mspTenantId": "msp_01...",
  "targetType": "tenant",
  "targetId": "client_01...",
  "standardId": "std_01...",
  "requestedByType": "user-or-system",
  "requestedById": "user_01...",
  "correlationId": "corr_01...",
  "enqueuedAt": "2026-03-12T16:00:07Z"
}
```
## Queue: `polling-trigger`

Purpose: execute polling checks for trigger sources without webhooks.

Message shape:

```json
{
  "messageType": "polling-trigger",
  "mspTenantId": "msp_01...",
  "workflowId": "wf_01...",
  "triggerId": "trg_01...",
  "connectionId": "conn_01...",
  "checkpointPartitionKey": "MSP#msp_01...|TRIGGER#trg_01...",
  "checkpointRowKey": "STATE",
  "correlationId": "corr_01...",
  "enqueuedAt": "2026-03-12T16:05:00Z"
}
```

## Queue: `dead-letter-review`

Purpose: optional operational review queue for poison events.

Message shape:

```json
{
  "messageType": "dead-letter-review",
  "sourceQueue": "workflow-step",
  "executionId": "exec_01...",
  "stepId": "step_01...",
  "failureCount": 5,
  "diagnosticBlobPath": "execution-data/.../dead-letter.json",
  "correlationId": "corr_01..."
}
```

## Key Vault Schema

Never store these values in Azure Table Storage or Blob Storage in raw form:

- API keys
- OAuth client secrets
- Refresh tokens
- Certificates and private keys
- Per-connection credential payloads

Recommended secret naming:

- `aoifmsp-connection-{connectionId}`
- `aoifmsp-clientapp-{appRegistrationId}`
- `aoifmsp-webhook-{triggerId}`

Recommended secret payload structure:

```json
{
  "authType": "oauth2-client-credentials",
  "clientId": "...",
  "clientSecret": "...",
  "tokenUrl": "...",
  "scopes": ["https://graph.microsoft.com/.default"]
}
```

Notes:

- Store a Key Vault secret URI or versionless secret reference in table rows.
- Use managed identity from Azure Functions to read secrets at runtime.
- Agent prompts and tool definitions must not contain raw secrets.
- OBO refresh tokens or related secure application model materials must be stored only in Key Vault or equivalent secure stores, never in tables or blobs as plaintext.

## AI Agent Node Shape

Recommended `ai-agent` workflow node shape:

```json
{
  "id": "node_42",
  "type": "ai-agent",
  "label": "Summarize security incident",
  "agentId": "agent_01...",
  "agentVersionId": "aver_01...",
  "foundryProjectRef": "prod",
  "operatingMode": "suggest-only",
  "inputTemplate": {
    "incident": "{{variables.incident}}"
  },
  "outputSchema": {
    "type": "object"
  },
  "toolPolicyRef": "policy_01...",
  "approvalPolicy": {
    "required": true
  },
  "timeoutSeconds": 90,
  "maxRetries": 2
}
```

## Management Operation Shape

Recommended direct management action payload shape:

```json
{
  "operationId": "mgmtop_01...",
  "operationType": "user-assign-license",
  "mspTenantId": "msp_01...",
  "clientTenantId": "client_01...",
  "authMode": "gdap-obo",
  "target": {
    "userId": "user-guid"
  },
  "parameters": {
    "addLicenses": [],
    "removeLicenses": []
  },
  "approval": {
    "required": false
  }
}
``` 

## Workflow JSON Shape

Draft and published workflow artifacts should share a common schema.

Recommended top-level shape:

```json
{
  "schemaVersion": 1,
  "workflowId": "wf_01...",
  "workflowVersionId": "wfv_01...",
  "displayName": "Create ticket from high severity alert",
  "trigger": {
    "type": "webhook",
    "config": {}
  },
  "nodes": [],
  "edges": [],
  "variables": [],
  "bindings": {
    "connections": []
  },
  "ai": {
    "designSessionId": null,
    "draftSource": "manual-or-ai"
  },
  "editor": {
    "viewport": {}
  }
}
```

Recommended deterministic action node shape:

```json
{
  "id": "node_17",
  "type": "connector-action",
  "label": "Create PSA ticket",
  "connectorId": "connr_01...",
  "connectorVersionId": "cver_01...",
  "actionId": "createTicket",
  "connectionId": "conn_01...",
  "inputs": {},
  "outputs": {
    "resultVar": "ticket"
  },
  "position": {
    "x": 420,
    "y": 180
  }
}
```

## Design-Time Assistant Output Shape

Recommended design-time assistant output for workflow drafting:

```json
{
  "goal": "Create incident triage workflow",
  "proposedWorkflowPatch": {},
  "assumptions": [],
  "warnings": [],
  "recommendedConnections": [],
  "recommendedTriggers": []
}
```

## Execution State Shape

The runtime context persisted to Blob Storage should be separate from execution summaries in tables.

Recommended shape:

```json
{
  "executionId": "exec_01...",
  "workflowId": "wf_01...",
  "workflowVersionId": "wfv_01...",
  "mspTenantId": "msp_01...",
  "clientTenantId": "client_01...",
  "status": "running",
  "variables": {},
  "completedNodeIds": [],
  "pendingNodeIds": [],
  "failedNodeIds": [],
  "correlationId": "corr_01..."
}
```

## Query Patterns to Support

The schema above is optimized for these MVP queries:

- List all client tenants for an MSP
- List all connectors for an MSP
- List connector versions for a connector
- Search actions for a connector version
- List agent definitions and versions for an MSP
- List connections available in MSP or client scope
- Load UI preferences and input bindings for an MSP user
- List tickets, devices, and documentation records for the technician workspace
- Load related context links for a ticket, tenant, device, or user
- List managed users for a client tenant
- List tenant groups and resolved members
- List standards assigned to a tenant and the latest drift state
- List management alerts across all customer tenants or for one tenant
- Read tenant management posture and GDAP-backed capability summaries for a client tenant
- List workflows for an MSP
- Load current draft and published version for a workflow
- List latest workflow executions
- Load step timeline for one execution
- View AI agent run summaries correlated to workflow executions
- View recent audit events for an MSP

## Tradeoffs and Rules

- Table Storage is the system of index, not the system of full document truth.
- Blob Storage is the source for heavy workflow, connector, and execution content.
- Denormalization is expected and acceptable where it simplifies UI reads.
- Immutable version records should never be updated after publication except for operational metadata if truly required.
- Execution records should prefer append-only behavior to preserve auditability.
- Foundry basic setup is the default cost and complexity posture.
- Standard Foundry BYO resources are an upgrade path, not a baseline requirement.
- Built-in tenant and user management should reuse the workflow action model and default to GDAP-backed delegated/OBO execution for customer administration.

## Recommended Next Implementation Artifacts

After this document, the next useful assets are:

1. TypeScript interfaces for the core entities and JSON artifacts.
2. A storage naming helper library for table keys, blob paths, queue payloads, and secret references.
3. Validation schemas for workflow drafts, workflow versions, AI agent nodes, queue messages, UI action maps, and security-sensitive configuration objects.
4. Example seed data for one MSP, one client tenant, one tenant-management profile, one managed user set, one tenant group, one standards template, one alert, one ticket, one device, one documentation record, one connector, one connection, one agent, and one workflow.
5. A policy pack or checklist that validates `docs/security-baseline.md` for each environment before deployment.










