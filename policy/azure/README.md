# AOIFMSP Azure Policy Pack

## Purpose

This folder contains a starter Azure Policy pack for AOIFMSP.

It is designed to enforce the highest-confidence custom controls from [security-baseline.md](../../docs/security-baseline.md) while staying easy to review and evolve.

## What This Pack Includes

- `main.bicep`
  Defines custom policy definitions and an initiative for AOIFMSP core production controls

- `main.prod.bicepparam`
  Example production-oriented parameters for deploying the pack

- `built-in-recommendations.md`
  Microsoft built-in policies that should usually be assigned alongside the custom AOIFMSP initiative

## Current Custom Controls

The custom initiative currently includes:

- Key Vault purge protection
- Key Vault public network access disabled
- Storage public network access disabled
- Storage Shared Key access disabled
- Storage blob public access disabled
- App Service HTTPS only
- App Service minimum TLS version 1.2+
- App Service public network access disabled
- Cognitive Services / Foundry parent resource managed identity required
- Cognitive Services / Foundry parent resource public network access disabled

## Deployment Model

The Bicep template targets management group scope.

Typical flow:

1. Deploy the custom definitions and initiative at the management group
2. Assign the initiative to the production subscription or management group
3. Layer Microsoft built-in policies for diagnostics, private endpoints, Defender-related controls, and other service-specific requirements

Example:

```powershell
New-AzManagementGroupDeployment `
  -ManagementGroupId "<management-group-id>" `
  -Location "eastus" `
  -TemplateFile ".\\policy\\azure\\main.bicep" `
  -TemplateParameterFile ".\\policy\\azure\\main.prod.bicepparam"
```

## Important Notes

- This starter pack intentionally focuses on custom controls we can express cleanly and review locally.
- Some important controls are better enforced with Microsoft built-in policies than custom definitions.
- Some capabilities such as Defender plans, diagnostic destinations, and SIEM routing are governance steps that go beyond pure custom policy definitions.

## Recommended Next Step

Assign this custom initiative together with the built-ins in [built-in-recommendations.md](./built-in-recommendations.md), then validate the results with [security-readiness-checklist.md](../../docs/security-readiness-checklist.md).
