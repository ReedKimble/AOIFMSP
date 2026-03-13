# AOIFMSP Self-Service Deployment Model

## Purpose

AOIFMSP should be deployable by an MSP from a cloned repository with GitHub Actions as the standard deployment path.

This document defines that operating model. The recommended public starting point is the GitHub Pages deployment guide for this repository; this file remains the repo-native reference for the workflow details. If you are preparing for a first deployment from inside the repo, start with [deployment-preparation.md](./deployment-preparation.md) first and then return here.

## Recommended Reading Order

1. GitHub Pages deployment guide for the MSP-facing onboarding experience
2. [README.md](../README.md) for the standard repo overview
3. [deployment-preparation.md](./deployment-preparation.md) for MSP readiness and required inputs
4. This document for the GitHub Actions deployment model
5. [security-baseline.md](./security-baseline.md) for production hardening expectations

## Deployment Goal

The target operator experience is:

1. Clone or fork the repo
2. Configure Azure authentication for the repo
3. Set a small set of GitHub secrets and workflow inputs
4. Run the deployment workflow
5. Get a functioning AOIFMSP test or production environment with infrastructure, runtime RBAC, AOIFMSP admin-group bootstrap, Function App publish, and frontend publish completed automatically

## Deployment Boundary

The repo now includes an end-to-end hosted baseline for test environments:

- Azure Storage account for AOIFMSP data services
- Azure Storage static website hosting for the web frontend
- Azure Key Vault
- Log Analytics and Application Insights
- Azure Functions hosting plan and Function App
- Function App managed identity
- Azure RBAC assignments for Storage and Key Vault access
- Deployment-principal blob-data access for static frontend publishing
- GitHub workflow steps that build and publish both backend and frontend artifacts
- Optional management-group policy deployment workflow for the AOIFMSP security baseline

This is sufficient for a real test-tenant deployment with a live backend, provided the deployment identity also has the Microsoft Graph permissions needed for the admin-group bootstrap step.

## One-Time Bootstrap Requirement

GitHub Actions cannot deploy to Azure until the repo has an Azure identity it can use.

That means each MSP still needs one one-time bootstrap step outside the main deployment workflow:

- Create a Microsoft Entra application or user-assigned managed identity for GitHub Actions
- Add a federated identity credential that trusts the GitHub repo and branch or environment
- Grant Azure RBAC to that deployment identity
- Store the identity details in GitHub repository or environment secrets

This is a platform bootstrap, not a per-deployment manual process.

## Recommended GitHub Authentication Model

Preferred model:

- GitHub Actions OIDC with `azure/login`
- No long-lived Azure client secret stored in GitHub
- One deployment identity per MSP-owned AOIFMSP deployment repo or environment

Required GitHub secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Recommended additional secret:

- `AZURE_PRINCIPAL_OBJECT_ID`

If `AZURE_PRINCIPAL_OBJECT_ID` is not supplied, the workflow attempts to resolve the object id from the signed-in service principal.

## Required Azure Permissions for the Deployment Identity

To let the workflow create resources, assign RBAC, and publish frontend assets, the deployment identity should have:

- `Contributor` on the target subscription or deployment resource group scope
- `User Access Administrator` or equivalent role-assignment permission on the same scope

The infrastructure deployment then assigns the identity `Storage Blob Data Contributor` on the AOIFMSP storage account so GitHub Actions can publish the static frontend without storage keys.


## Microsoft Entra Bootstrap For AOIFMSP Admins

The standard deployment workflow should create the `AOIFMSP Admins` security group in the MSP tenant and add the initial setup operator to it.

Why this matters:

- connector import and normalization governance are privileged platform operations
- workflow and tenant-management capabilities should not be open to every authenticated MSP user by default
- the platform needs a stable Entra-backed administrative boundary from the first deployment

The workflow now requires one bootstrap-admin identity input:

- `bootstrap_admin_user_principal_name`
- `bootstrap_admin_object_id`

Provide either the UPN or the object id. The workflow now fails fast if neither is supplied, because AOIFMSP deployment should always leave the MSP with an initial platform administrator in the AOIFMSP Admins group.

Required Microsoft Graph application permissions for the GitHub deployment identity:

- `Group.ReadWrite.All`
- `User.Read.All`

Depending on the tenant's Graph governance posture, `Directory.Read.All` or stronger delegated review may also be needed for troubleshooting or future role/bootstrap expansion.

These permissions are part of the one-time repo bootstrap for deployment automation, not a per-run manual step.
## Runtime Identity Model

The deployed Function App uses a system-assigned managed identity.

The deployment templates automatically assign it these data-plane roles:

- `Storage Blob Data Contributor`
- `Storage Queue Data Contributor`
- `Storage Table Data Contributor`
- `Key Vault Secrets User`

This matches the AOIFMSP architecture and security baseline: the application runtime should use Microsoft Entra-based authorization rather than storage keys or embedded secrets.

## GitHub Workflows in This Repo

### Validate Platform

Path:

- `.github/workflows/validate-platform.yml`

Purpose:

- Install dependencies
- Run TypeScript typecheck
- Build frontend and Functions artifacts
- Prepare the Functions publish package
- Build the Bicep templates

### Deploy Platform

Path:

- `.github/workflows/deploy-platform.yml`

Purpose:

- Authenticate to Azure with OIDC
- Deploy the subscription-scope AOIFMSP platform foundation
- Build and package the Function App
- Publish the Function App to Azure Functions
- Build the frontend against the live Function App URL
- Publish the frontend to Azure Storage static website hosting
- Publish optional MSP logo assets to the static site branding folder
- Apply MSP branding settings to the Function App so the UI restyles itself after deployment
- Configure Function App CORS for the hosted frontend
- Emit deployment outputs in the workflow summary

### Deploy Policy Pack

Path:

- `.github/workflows/deploy-policy.yml`

Purpose:

- Deploy the AOIFMSP custom policy initiative to a management group

## Repo Inputs for the Platform Deployment Workflow

The workflow currently asks for:

- Azure region
- Resource group name
- Name prefix
- Environment name
- Storage public network access mode
- Key Vault public network access mode
- Function App public network access mode
- MSP display name and abbreviation
- Primary, secondary, and surface brand colors
- Optional repo-relative paths for a logo mark and wordmark image

These are intentionally explicit so each MSP can choose a lower-friction test posture or a more locked-down production posture, while also leaving deployment with a branded shell that matches the MSP from first load.

Logo inputs should point to files committed in the cloned repo, for example `branding/mark.png` or `branding/wordmark.svg`. The workflow uploads those files into the static site and then writes their URLs into Function App settings for the bootstrap API.

## First Deployment Flow

For a typical MSP first deployment:

1. Clone or fork the repo into an MSP-owned GitHub organization or repository.
2. Configure GitHub OIDC trust to Azure for the deployment identity.
3. Add the required GitHub secrets.
4. Commit any logo assets you want to use in the branded shell.
5. Run `Deploy Platform` with the MSP name, abbreviation, colors, bootstrap admin identity, and Azure environment inputs.
6. Open the frontend URL from the workflow summary and confirm the initial shell, branding, and admin-group bootstrap completed as expected.

## Test Tenant Deployment Notes

For a straightforward GitHub-hosted runner deployment into a test tenant:

- keep Storage public network access as `Enabled`
- keep Function App public network access as `Enabled`
- use the live backend mode built into the workflow

If you later move to private networking, GitHub-hosted runners will no longer be enough for app publishing. At that point the publish workflow should run from a self-hosted runner that can reach the private endpoints.

## Important Security Note

A repo that is easy to deploy must not become a repo that is easy to misconfigure.

For that reason, AOIFMSP keeps these design rules:

- OIDC is preferred over stored Azure secrets
- Runtime identity is managed identity first
- RBAC is created by infrastructure-as-code, not by post-deployment click paths
- Frontend publishing uses Entra-authenticated blob upload, not storage keys
- Security policy deployment is available as a workflow, not a tribal-knowledge step
- Production hardening requirements remain governed by [security-baseline.md](./security-baseline.md)

## Remaining Deployment Gaps

The repo now covers a real test deployment path, but a few production concerns are still intentionally separate:

- Private endpoints and private DNS topology
- Protected ingress such as Front Door or equivalent edge
- Foundry resource deployment profiles
- broader Microsoft Entra app registration and AOIFMSP app-role seeding beyond the admin-group bootstrap where needed
- Post-deploy smoke tests and readiness checks

## Recommended Next Step

Use the current workflow to deploy into the test tenant, then add:

1. post-deploy health and seed validation checks
2. expand Microsoft Entra bootstrap from the AOIFMSP Admins group into full app-role and group-to-role seeding
3. production-grade private networking modules

