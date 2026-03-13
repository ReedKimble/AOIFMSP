# AOIFMSP

AOIFMSP stands for `Automation of Integrations for Managed Service Providers`.

It is an MSP-operated application platform that helps providers connect their core tool stack, normalize cross-tool actions, automate workflows, and manage customer Microsoft 365 environments from one governed surface.

## What This Repo Contains

- Azure Functions backend for AOIFMSP runtime and APIs
- React frontend for the technician, workflow, tenant admin, and connector surfaces
- Shared TypeScript data-layer contracts, schemas, key builders, and repository services
- Azure infrastructure and policy templates
- GitHub Actions workflows for validation, platform deployment, policy deployment, and documentation publishing
- Architecture, security, and data-model reference documentation

## Start Here

The recommended onboarding path is the GitHub Pages documentation site, which is intended to be the public landing space and the easiest way to prepare for deployment.

- GitHub Pages deployment guide: published from the `Deploy Docs Site` workflow
- Direct docs source: [docs/deployment-preparation.md](docs/deployment-preparation.md)
- Deployment workflow details: [docs/deployment-automation.md](docs/deployment-automation.md)

## Repository Structure

- [apps/web](apps/web) - main AOIFMSP application shell
- [apps/functions](apps/functions) - Azure Functions backend
- [src/data-layer](src/data-layer) - shared platform contracts and storage abstractions
- [infra/azure/platform](infra/azure/platform) - Azure infrastructure templates
- [policy/azure](policy/azure) - policy initiative starter pack
- [docs](docs) - reference architecture, deployment, and security documentation
- [site](site) - GitHub Pages landing site and deployment wizard

## Local Development

Install dependencies:

```bash
npm install
```

Common commands:

```bash
npm run dev:web
npm run dev:functions
npm run typecheck
npm run build
```

## Deployment

The standard hosted deployment path is GitHub Actions.

At a high level:

1. Clone or fork the repo into an MSP-owned GitHub repository.
2. Configure GitHub OIDC trust to Azure.
3. Set the required GitHub secrets.
4. Use the GitHub Pages deployment guide and wizard to prepare workflow inputs.
5. Run the `Deploy Platform` workflow.

See:

- [docs/deployment-preparation.md](docs/deployment-preparation.md)
- [docs/deployment-automation.md](docs/deployment-automation.md)
- [docs/security-baseline.md](docs/security-baseline.md)

## Additional Reference Docs

- [docs/architecture.md](docs/architecture.md)
- [docs/data-model.md](docs/data-model.md)
- [docs/action-normalization.md](docs/action-normalization.md)
- [docs/ui-ux-principles.md](docs/ui-ux-principles.md)
- [docs/technician-workspace.md](docs/technician-workspace.md)

## Current Status

This repository already includes a working platform foundation, deployment automation, shared contracts, and a growing interactive application shell. It is not yet a finished production product, but it is structured for MSP-led deployment, guided onboarding, and iterative expansion.
