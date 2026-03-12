# AOIFMSP Security Readiness Checklist

## Purpose

This checklist operationalizes the requirements in [security-baseline.md](/C:/Codex/AOIFMSP/docs/security-baseline.md) for design review, pre-production validation, and production go-live.

Use it in three phases:

1. Architecture review
2. Environment readiness review
3. Production go-live approval

## How To Use This Checklist

- Mark each item as `Done`, `Exception`, or `Not Ready`
- Record evidence for every `Done` item
- Record owner, compensating controls, and expiry for every `Exception`
- Do not approve production go-live while any required item is `Not Ready`

## Phase 1: Architecture Review

### Identity and Access

- [ ] AOIFMSP production resources use managed identity wherever the Azure service supports it
- [ ] Azure Storage data access uses Microsoft Entra auth where supported
- [ ] Customer administration defaults to GDAP-backed delegated/OBO access
- [ ] A dedicated Secure Application Model App+User service-account pattern is defined for unattended admin scenarios
- [ ] MFA and Conditional Access requirements are documented for privileged operators and service accounts
- [ ] Customer-tenant app registrations are limited to platform-scoped capabilities and explicitly reviewed before high-privilege use

Evidence:
- Identity architecture review
- Role mapping
- Conditional Access design

### Network and Ingress

- [ ] Production web access uses a protected ingress pattern such as Front Door/WAF or equivalent
- [ ] Backend services are not exposed directly to browsers or general public clients
- [ ] Private endpoints or equivalent private connectivity are defined for Key Vault, Storage, and Foundry where supported
- [ ] Any production public-network exceptions are documented with compensating controls

Evidence:
- Network topology
- Ingress diagram
- Exception register

### Data and Secrets

- [ ] AOIFMSP does not store secrets in Table Storage or Blob Storage in plaintext
- [ ] Key Vault soft delete and purge protection are required in production
- [ ] Key Vault secret rotation and expiration expectations are defined for high-value credentials
- [ ] Storage public anonymous access is disabled for operational data
- [ ] Shared Key access is disallowed in production unless an exception is approved

Evidence:
- Data classification matrix
- Secret handling design
- Storage auth model

### AI and Agent Security

- [ ] Foundry setup mode is selected through security review, not cost preference alone
- [ ] Sensitive or privileged workloads use the correct Foundry networking and storage posture
- [ ] Agent tool policies are explicit and least-privilege
- [ ] Agent actions that can affect customer state have approval boundaries where required
- [ ] Agent runs are correlated to AOIFMSP audit and execution records

Evidence:
- AI security review
- Tool policy definitions
- Approval model

## Phase 2: Environment Readiness Review

### Azure Policy and Governance

- [ ] AOIFMSP security initiative is deployed to the target management group or subscription scope
- [ ] Policy effects are set appropriately for the environment
- [ ] Non-compliant resources are remediated or documented as approved exceptions
- [ ] Azure Policy compliance state is reviewed before rollout

Evidence:
- Policy assignment record
- Compliance export
- Exception approvals

### Defender, Logging, and Monitoring

- [ ] Microsoft Defender for Cloud is enabled with the required plans and recommendations reviewed
- [ ] Diagnostic settings are enabled for web, Functions, Storage, Key Vault, and AI resources
- [ ] Security-relevant telemetry is routed to centralized monitoring and SIEM where available
- [ ] Alerts exist for secret access anomalies, policy drift, and high-risk admin actions

Evidence:
- Diagnostic settings inventory
- Defender posture summary
- Alert definitions

### Key Vault Validation

- [ ] Key Vault purge protection is enabled
- [ ] Key Vault soft delete is enabled
- [ ] Key Vault public network access is disabled or tightly restricted per approved design
- [ ] Key Vault access is RBAC-based or least-privilege by policy
- [ ] AOIFMSP workloads retrieve secrets through managed identity

Evidence:
- Portal screenshots or ARM export
- Access review

### Storage Validation

- [ ] Storage accounts use HTTPS only
- [ ] Shared Key access is disabled where required
- [ ] Public network access is disabled or tightly restricted per approved design
- [ ] Blob public access is disabled
- [ ] Private endpoint topology is verified where required

Evidence:
- ARM export
- Policy compliance
- Network validation

### App and Function Hosting Validation

- [ ] HTTPS only is enabled
- [ ] Minimum TLS version is compliant
- [ ] Public network access is disabled when the production design requires private ingress only
- [ ] Remote debugging is disabled
- [ ] Authentication and authorization configuration is reviewed

Evidence:
- Hosting configuration export
- Policy compliance

### Foundry and AI Validation

- [ ] Foundry public network posture matches the approved security profile
- [ ] Managed identity and private link requirements are validated where required
- [ ] Agent projects, hubs, and dependent resources are reviewed for network exposure
- [ ] Agent run logging and trace correlation are working

Evidence:
- Foundry networking screenshots
- Test run correlation output

## Phase 3: Production Go-Live Approval

### Operational Controls

- [ ] Break-glass and incident-response procedures exist for identity compromise and token revocation
- [ ] OBO refresh-token handling procedures are documented
- [ ] Exception register is reviewed and approved
- [ ] Backup, recovery, and resource recovery expectations are documented for critical services
- [ ] Support team knows how to investigate audit trails, policy drift, and privileged actions

Evidence:
- Runbooks
- Incident playbooks
- Approval record

### Final Approval

- [ ] Security baseline review completed
- [ ] Architecture review completed
- [ ] Environment readiness review completed
- [ ] Exceptions approved
- [ ] Production rollout approved

Approval Notes:

- Reviewer:
- Date:
- Decision:
- Conditions:
