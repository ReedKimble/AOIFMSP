# Local Development

## What works today

The web app is set to `mock` API mode by default for local development. That means `npm run dev:web` will load the technician workspace, workflow designer shell, and tenant administration flow without requiring the Azure Functions host.

## Why you saw `500` errors

Those requests were going through the Vite proxy to `/api/*`, but this machine does not currently have Azure Functions Core Tools installed, so the local Functions host could not be started.

## Current local options

### Fast UI demo mode

1. Run `npm run dev:web`
2. Open `http://localhost:5173`

This uses `apps/web/.env.development` with `VITE_AOIFMSP_API_MODE=mock`.

### Full stack local mode

1. Install Azure Functions Core Tools v4
2. Create `apps/functions/local.settings.json` from `apps/functions/local.settings.example.json`
3. Change `apps/web/.env.development` to:
   - `VITE_AOIFMSP_API_MODE=functions`
   - `VITE_AOIFMSP_API_BASE_URL=http://localhost:7071`
4. Run `npm run dev:functions`
5. Run `npm run dev:web`

## Hosted test deployment mode

The GitHub deployment workflow builds the frontend in live-backend mode automatically:

- `VITE_AOIFMSP_API_MODE=functions`
- `VITE_AOIFMSP_API_BASE_URL=https://<function-app>.azurewebsites.net`

That build is then published to Azure Storage static website hosting.

## Notes

- Mock mode is only for local UI and product-flow development.
- The Functions app contains the real Azure-backed repository layer and can run against live storage and Key Vault once the local Functions runtime is available.
- The clone-to-test-tenant deployment path is documented in [deployment-automation.md](./deployment-automation.md).
