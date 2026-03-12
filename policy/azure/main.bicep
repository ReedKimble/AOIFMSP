targetScope = 'managementGroup'

@description('Name of the AOIFMSP security initiative.')
param initiativeName string = 'aoifmsp-security-baseline'

@description('Display name of the AOIFMSP security initiative.')
param initiativeDisplayName string = 'AOIFMSP Security Baseline'

@allowed([
  'Audit'
  'Deny'
  'Disabled'
])
param keyVaultEffect string = 'Deny'

@allowed([
  'Audit'
  'Deny'
  'Disabled'
])
param storageEffect string = 'Deny'

@allowed([
  'Audit'
  'Deny'
  'Disabled'
])
param appServiceEffect string = 'Deny'

@allowed([
  'Audit'
  'Deny'
  'Disabled'
])
param cognitiveServicesEffect string = 'Deny'

var metadata = {
  category: 'Security'
  source: 'AOIFMSP'
  version: '1.0.0'
}

resource keyVaultPurgeProtection 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-kv-purge-protection'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - Key Vaults must enable purge protection'
    description: 'Key Vault purge protection is required for AOIFMSP production environments.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.KeyVault/vaults'
          }
          {
            field: 'Microsoft.KeyVault/vaults/enablePurgeProtection'
            notEquals: true
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource keyVaultPublicNetworkDisabled 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-kv-public-network-disabled'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - Key Vault public network access must be disabled'
    description: 'Production Key Vaults should disable public network access unless an exception is approved.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.KeyVault/vaults'
          }
          {
            field: 'Microsoft.KeyVault/vaults/publicNetworkAccess'
            notEquals: 'Disabled'
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource storageSharedKeyDisabled 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-storage-disable-shared-key'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - Storage accounts must disallow Shared Key access'
    description: 'AOIFMSP production Storage should use Microsoft Entra-based authorization where supported.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.Storage/storageAccounts'
          }
          {
            field: 'Microsoft.Storage/storageAccounts/allowSharedKeyAccess'
            notEquals: false
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource storagePublicNetworkDisabled 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-storage-public-network-disabled'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - Storage accounts must disable public network access'
    description: 'AOIFMSP production Storage should not be publicly reachable unless an approved exception exists.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.Storage/storageAccounts'
          }
          {
            field: 'Microsoft.Storage/storageAccounts/publicNetworkAccess'
            notEquals: 'Disabled'
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource storageBlobPublicAccessDisabled 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-storage-blob-public-access-disabled'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - Storage accounts must disable blob public access'
    description: 'AOIFMSP operational Storage must not allow public blob access.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.Storage/storageAccounts'
          }
          {
            field: 'Microsoft.Storage/storageAccounts/allowBlobPublicAccess'
            notEquals: false
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource appServiceHttpsOnly 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-appservice-https-only'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - App Service apps must require HTTPS'
    description: 'AOIFMSP web and API workloads on App Service or Functions must require HTTPS.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.Web/sites'
          }
          {
            field: 'Microsoft.Web/sites/httpsOnly'
            notEquals: true
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource appServiceMinTls 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-appservice-min-tls'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - App Service apps must use TLS 1.2 or newer'
    description: 'AOIFMSP web and API workloads on App Service or Functions must use TLS 1.2 or newer.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.Web/sites'
          }
          {
            anyOf: [
              {
                field: 'Microsoft.Web/sites/siteConfig.minTlsVersion'
                equals: '1.0'
              }
              {
                field: 'Microsoft.Web/sites/siteConfig.minTlsVersion'
                equals: '1.1'
              }
              {
                field: 'Microsoft.Web/sites/siteConfig.minTlsVersion'
                exists: false
              }
            ]
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource appServicePublicNetworkDisabled 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-appservice-public-network-disabled'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - App Service apps must disable public network access'
    description: 'Production AOIFMSP App Service and Function workloads should disable public network access unless protected ingress design requires an exception.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.Web/sites'
          }
          {
            field: 'Microsoft.Web/sites/publicNetworkAccess'
            notEquals: 'Disabled'
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource cognitiveServicesManagedIdentity 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-cognitiveservices-managed-identity'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - Cognitive Services accounts must use managed identity'
    description: 'AOIFMSP Azure AI / Foundry parent resources should use managed identity.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.CognitiveServices/accounts'
          }
          {
            anyOf: [
              {
                field: 'Microsoft.CognitiveServices/accounts/identity.type'
                exists: false
              }
              {
                field: 'Microsoft.CognitiveServices/accounts/identity.type'
                equals: 'None'
              }
            ]
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource cognitiveServicesPublicNetworkDisabled 'Microsoft.Authorization/policyDefinitions@2023-04-01' = {
  name: 'aoifmsp-cognitiveservices-public-network-disabled'
  properties: {
    policyType: 'Custom'
    mode: 'All'
    displayName: 'AOIFMSP - Cognitive Services accounts must disable public network access'
    description: 'AOIFMSP Azure AI / Foundry parent resources should disable public network access unless an approved exception exists.'
    metadata: metadata
    parameters: {
      effect: {
        type: 'String'
        metadata: {
          displayName: 'Effect'
        }
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
        defaultValue: 'Deny'
      }
    }
    policyRule: {
      if: {
        allOf: [
          {
            field: 'type'
            equals: 'Microsoft.CognitiveServices/accounts'
          }
          {
            field: 'Microsoft.CognitiveServices/accounts/publicNetworkAccess'
            notEquals: 'Disabled'
          }
        ]
      }
      then: {
        effect: '[parameters(''effect'')]'
      }
    }
  }
}

resource securityInitiative 'Microsoft.Authorization/policySetDefinitions@2023-04-01' = {
  name: initiativeName
  properties: {
    policyType: 'Custom'
    displayName: initiativeDisplayName
    description: 'AOIFMSP starter security baseline initiative for production governance.'
    metadata: metadata
    parameters: {
      keyVaultEffect: {
        type: 'String'
        defaultValue: keyVaultEffect
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
      }
      storageEffect: {
        type: 'String'
        defaultValue: storageEffect
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
      }
      appServiceEffect: {
        type: 'String'
        defaultValue: appServiceEffect
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
      }
      cognitiveServicesEffect: {
        type: 'String'
        defaultValue: cognitiveServicesEffect
        allowedValues: [
          'Audit'
          'Deny'
          'Disabled'
        ]
      }
    }
    policyDefinitions: [
      {
        policyDefinitionId: keyVaultPurgeProtection.id
        policyDefinitionReferenceId: 'keyVaultPurgeProtection'
        parameters: {
          effect: {
            value: '[parameters(''keyVaultEffect'')]'
          }
        }
      }
      {
        policyDefinitionId: keyVaultPublicNetworkDisabled.id
        policyDefinitionReferenceId: 'keyVaultPublicNetworkDisabled'
        parameters: {
          effect: {
            value: '[parameters(''keyVaultEffect'')]'
          }
        }
      }
      {
        policyDefinitionId: storageSharedKeyDisabled.id
        policyDefinitionReferenceId: 'storageSharedKeyDisabled'
        parameters: {
          effect: {
            value: '[parameters(''storageEffect'')]'
          }
        }
      }
      {
        policyDefinitionId: storagePublicNetworkDisabled.id
        policyDefinitionReferenceId: 'storagePublicNetworkDisabled'
        parameters: {
          effect: {
            value: '[parameters(''storageEffect'')]'
          }
        }
      }
      {
        policyDefinitionId: storageBlobPublicAccessDisabled.id
        policyDefinitionReferenceId: 'storageBlobPublicAccessDisabled'
        parameters: {
          effect: {
            value: '[parameters(''storageEffect'')]'
          }
        }
      }
      {
        policyDefinitionId: appServiceHttpsOnly.id
        policyDefinitionReferenceId: 'appServiceHttpsOnly'
        parameters: {
          effect: {
            value: '[parameters(''appServiceEffect'')]'
          }
        }
      }
      {
        policyDefinitionId: appServiceMinTls.id
        policyDefinitionReferenceId: 'appServiceMinTls'
        parameters: {
          effect: {
            value: '[parameters(''appServiceEffect'')]'
          }
        }
      }
      {
        policyDefinitionId: appServicePublicNetworkDisabled.id
        policyDefinitionReferenceId: 'appServicePublicNetworkDisabled'
        parameters: {
          effect: {
            value: '[parameters(''appServiceEffect'')]'
          }
        }
      }
      {
        policyDefinitionId: cognitiveServicesManagedIdentity.id
        policyDefinitionReferenceId: 'cognitiveServicesManagedIdentity'
        parameters: {
          effect: {
            value: '[parameters(''cognitiveServicesEffect'')]'
          }
        }
      }
      {
        policyDefinitionId: cognitiveServicesPublicNetworkDisabled.id
        policyDefinitionReferenceId: 'cognitiveServicesPublicNetworkDisabled'
        parameters: {
          effect: {
            value: '[parameters(''cognitiveServicesEffect'')]'
          }
        }
      }
    ]
  }
}
