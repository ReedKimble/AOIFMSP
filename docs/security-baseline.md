# AOIFMSP Microsoft Security Baseline

## Purpose

This document defines the minimum Microsoft-aligned security posture for AOIFMSP.

It exists to make one important distinction explicit:

- Low-cost development and test choices are acceptable where risk is low
- Production handling privileged MSP operations and customer data must use a stronger security profile even when that increases cost or complexity

## Security Profiles

### Development and Test Profile

Allowed goals:

- Lower cost
- Faster setup
- Easier iteration

Constraints:

- No production customer secrets
- No long-lived privileged tokens beyond what is needed for controlled testing
- Clearly separated subscriptions, resources, and identities from production

### Production Profile

Required goals:

- Private or tightly restricted network paths where the service supports them
- Managed identity and Microsoft Entra-based service auth by default
- Secure Application Model controls for GDAP-backed delegated/OBO administration
- Protected ingress for admin and technician surfaces
- Central policy, logging, alerting, and threat detection

## Identity and Access

### Microsoft Entra and Managed Identity

Production requirements:

- Use managed identities for Azure-to-Azure access wherever supported
- Avoid static application secrets for AOIFMSP's own Azure resource access
- Use Microsoft Entra authorization for Storage, Key Vault, and other supported services
- Keep least-privilege RBAC assignments scoped to the specific resource and role needed
- Prefer GitHub OIDC or equivalent federated workload identity for deployment automation instead of long-lived deployment secrets
- Treat deployment identities as privileged identities with their own review, rotation, and scope controls

### GDAP and Secure Application Model

Production requirements:

- Use GDAP as the default customer administration model
- Use delegated/OBO flows for customer management operations by default
- Use a dedicated App+User service account pattern for Secure Application Model scenarios
- Require MFA and Conditional Access for privileged operator and service-account access
- Scope any service account through the minimum required groups and GDAP role assignments
- Store refresh tokens and related secure materials only in Key Vault or equivalent secure stores
- Define token rotation, revocation, and incident-response procedures

### Customer-Tenant App Registrations

Production requirements:

- Treat customer-tenant app registrations as platform-scoped integrations, not the default path for broad app-only admin permissions
- Require explicit review before granting any high-privilege customer-tenant application permission
- Document which platform features depend on customer-local consent versus GDAP-backed delegated access

## Network and Ingress

### Web and API Surface

Production requirements:

- Use a protected ingress pattern for AOIFMSP admin and technician surfaces
- Put public web entry behind a hardened edge such as Front Door/WAF or an equivalent protected web layer
- Avoid exposing backend resource endpoints directly to users or browsers
- Prefer hosting patterns that support private connectivity from the web tier to backend services

### Private Connectivity

Production requirements:

- Use private endpoints or equivalent private connectivity for Key Vault, Storage, and Foundry resources where supported
- Disable public network access where the service and operating model allow it
- If a service must remain publicly reachable, restrict it as tightly as possible and document the exception

## Storage Security

Production requirements:

- Use Microsoft Entra authorization for Storage data access wherever supported
- Disallow Shared Key authorization in production unless a documented exception exists
- Prevent anonymous or public data access for operational containers and data paths
- Separate data retention and lifecycle policies by container purpose
- Protect sensitive execution payloads, tickets, device summaries, and documentation context with network restrictions and RBAC

## Key Vault Security

Production requirements:

- Enable soft delete and purge protection
- Use RBAC or access policies with least privilege
- Restrict network access with private endpoints or tightly controlled firewall rules
- Use secret rotation and expiration policies where practical
- Send diagnostics and audit logs to centralized monitoring

## Azure AI Foundry Security

Production requirements:

- Do not assume Foundry `basic` setup is sufficient for every production MSP scenario
- Require a security review before using `basic` with sensitive customer data or privileged admin actions
- Use standard BYO-resources and private networking when customer governance, regulated data, or stronger isolation is required
- Correlate agent runs with AOIFMSP audit records and log policy decisions for agent-executed actions

## Monitoring, Governance, and Response

Production requirements:

- Apply Azure Policy to enforce key platform controls
- Enable Microsoft Defender for Cloud recommendations and relevant plans
- Configure diagnostics for web tier, Functions, Storage, Key Vault, and Foundry-related resources
- Route security-relevant telemetry to centralized monitoring and SIEM where available
- Alert on identity misuse, secret access anomalies, policy drift, and high-risk admin actions

## Exceptions Process

Any deviation from this baseline should be documented with:

- The reason for the exception
- The affected resource or feature
- Compensating controls
- Review owner
- Expiration or revisit date

## Implementation Assets

AOIFMSP keeps two companion artifacts alongside this baseline:

- [security-readiness-checklist.md](./security-readiness-checklist.md)
- [policy/azure/README.md](../policy/azure/README.md)

Use the checklist for go-live readiness and the policy pack for enforceable platform controls.


