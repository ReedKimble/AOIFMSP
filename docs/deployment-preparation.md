# Deployment Preparation

## Purpose

This guide is the MSP-focused preparation document for AOIFMSP.

Use it before running the GitHub deployment workflow so the first deployment is smooth, predictable, and leaves the MSP with a usable AOIFMSP environment rather than only partially created infrastructure. The GitHub Pages deployment guide is intended to be the easier MSP-facing walkthrough; this file remains the repo-native preparation reference.

## What AOIFMSP Is

AOIFMSP is an MSP-operated platform that deploys into the MSP's Microsoft 365 tenant and provides:

- normalized integrations across PSA, RMM, documentation, Graph, and custom APIs
- a visual workflow platform for automation and orchestration
- guided tenant and user administration
- a technician workspace that links tickets, devices, documentation, and workflow context
- a connector-governance layer so imported APIs are reviewed before becoming standard platform actions

## What The First Deployment Should Achieve

A successful initial deployment should leave you with:

- AOIFMSP Azure infrastructure created
- backend and frontend published
- `AOIFMSP Admins` created in the MSP tenant
- the initial AOIFMSP admin added to that group
- MSP branding applied to the shell
- a hosted URL you can open and begin validating

## Preparation Checklist

### MSP tenant and operator

Before deployment, confirm:

- the MSP Microsoft 365 tenant for AOIFMSP is chosen
- the person whose identity will be added to `AOIFMSP Admins` is known
- GDAP relationships already exist for customer tenants you plan to manage through AOIFMSP

### Azure subscription

Prepare:

- the Azure subscription that will host AOIFMSP
- a resource group naming convention
- a short resource naming prefix of at least 3 alphanumeric characters
- the first environment label such as `test` or `prod`

### GitHub repository

Prepare:

- an MSP-owned clone or fork of the repo
- GitHub Actions enabled
- permission to add repository or environment secrets

### GitHub-to-Azure identity

Prepare a deployment identity with:

- GitHub OIDC trust configured for the repo
- `Contributor` on the target scope
- `User Access Administrator` or equivalent on the target scope
- Microsoft Graph application permissions for admin-group bootstrap:
  - `Group.ReadWrite.All`
  - `User.Read.All`

### Branding inputs

Prepare:

- MSP display name
- MSP abbreviation
- primary brand color in hex
- secondary brand color in hex
- surface/background color in hex
- optional logo mark file committed into the repo
- optional wordmark file committed into the repo

### Initial connector strategy

Before import work begins, decide:

- which PSA should be authoritative for tickets and tasking
- which RMM should be authoritative for devices and operational alerts
- which documentation system should be authoritative for runbooks and knowledge
- which connector set should back tenant/user/license/group/role administration
- where overlap already exists and where AOIFMSP should fill gaps instead of duplicating mature tooling

## Required GitHub Secrets

Set these in the repository or environment:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- optionally `AZURE_PRINCIPAL_OBJECT_ID`

## Required Deployment Workflow Inputs

The `Deploy Platform` workflow now expects these operator-supplied values:

- Azure region
- resource group name
- name prefix
- environment name
- Storage public network access mode
- Key Vault public network access mode
- Function App public network access mode
- bootstrap admin UPN or bootstrap admin object id
- MSP display name
- MSP abbreviation
- primary brand color
- secondary brand color
- surface color
- optional logo mark path
- optional wordmark path

If neither bootstrap admin field is supplied, the workflow fails intentionally.

## First Deployment Recommendation

For most MSPs, the best first run is:

1. Deploy a `test` environment first.
2. Keep Storage and Function App public network access enabled for that first test unless private networking is already prepared.
3. Use one known-good AOIFMSP admin identity.
4. Apply branding during the initial deployment so the team can validate the hosted shell in realistic form.
5. Import core PSA, RMM, documentation, and Graph-adjacent connectors after deployment.
6. Review normalized action mappings before exposing imported actions broadly to technicians.

## After Deployment

Once the workflow completes:

1. Open the frontend URL from the workflow summary.
2. Confirm the shell branding matches the values you provided.
3. Confirm the initial AOIFMSP admin can sign in when auth is enabled for the target environment.
4. Validate that `AOIFMSP Admins` exists in the MSP tenant and contains the bootstrap admin.
5. Begin connector onboarding with the primary PSA, RMM, and documentation tools.
6. Review normalized action catalog results in Connector Studio before enabling broad usage.

## Related Docs

- [README.md](../README.md)
- [deployment-automation.md](./deployment-automation.md)
- [security-baseline.md](./security-baseline.md)
- [security-readiness-checklist.md](./security-readiness-checklist.md)
- [action-normalization.md](./action-normalization.md)
