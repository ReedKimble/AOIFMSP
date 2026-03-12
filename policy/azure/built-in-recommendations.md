# AOIFMSP Recommended Microsoft Built-In Policies

These Microsoft built-in policies should usually be assigned alongside the AOIFMSP custom initiative in [main.bicep](/C:/Codex/AOIFMSP/policy/azure/main.bicep).

Use Microsoft built-ins where they already express the service control clearly and are kept current by Microsoft.

## Key Vault

- `Azure Key Vault should use RBAC permission model`
- `Azure Key Vault should disable public network access`
- `[Preview]: Azure Key Vaults should use private link`
- `Key vaults should have deletion protection enabled`
- `Key vaults should have soft delete enabled`
- `Key Vault secrets should have an expiration date`
- `Resource logs in Key Vault should be enabled`

Reference:
- [Built-in policy definitions for Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/policy-reference)

## Storage

- `Configure storage accounts to disable public network access`
- `Configure Storage account to use a private link connection`
- `Storage accounts should prevent shared key access`
- `Storage accounts should restrict network access`
- `Storage accounts should prevent public blob access`
- `Storage accounts should have infrastructure encryption`
- Resource log enabling policies for Storage to Log Analytics or Event Hub

Reference:
- [Built-in policy definitions for Azure Storage](https://learn.microsoft.com/en-us/azure/storage/common/policy-reference)

## App Service and Functions

- `App Service apps should disable public network access`
- `App Service apps should only be accessible over HTTPS`
- `Configure App Service apps to use the latest TLS version`
- `App Service apps should have authentication enabled`
- `App Service apps should have resource logs enabled`
- `App Service apps should have remote debugging turned off`
- `Function apps should have authentication enabled`
- `Function apps should only be accessible over HTTPS`
- `Configure Function apps to use the latest TLS version`
- `Configure Function apps to turn off remote debugging`

Reference:
- [Built-in policy definitions for Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/policy-reference)

## Azure AI / Foundry Parent Resources

- `Azure AI Services resources should restrict network access`
- `Azure AI Services resources should use Azure Private Link`
- `Cognitive Services accounts should use a managed identity`

Reference:
- [Built-in policy definitions for Foundry Tools / Azure AI Services](https://learn.microsoft.com/en-us/azure/ai-services/policy-reference)

## Governance and Monitoring

- Built-ins that enable diagnostic settings for supported resources
- Microsoft cloud security benchmark initiatives
- Defender for Cloud recommendation alignment policies

References:
- [List of built-in policy definitions](https://learn.microsoft.com/en-us/azure/governance/policy/samples/built-in-policies)
- [Microsoft cloud security benchmark policies](https://learn.microsoft.com/en-us/azure/governance/policy/samples/gov-azure-security-benchmark)
