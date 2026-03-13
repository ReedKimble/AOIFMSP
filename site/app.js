const platformAreas = [
  {
    title: "Technician Workspace",
    body: "Ticket-centered operations across PSA, RMM, docs, workflows, and tenant context.",
  },
  {
    title: "Workflow Designer",
    body: "A MakeCode-style orchestration surface with reusable blocks, branching, AI assistance, and governed actions.",
  },
  {
    title: "Tenant Administration",
    body: "Guided MSP-centric user, tenant, standards, and operational management over delegated access.",
  },
  {
    title: "Connector Studio",
    body: "Connector import, connection setup, action normalization, overlap review, and platform action governance.",
  },
];

const faqItems = [
  {
    question: "Do I need to replace my PSA, RMM, or documentation tools?",
    answer:
      "No. AOIFMSP is designed to sit over the existing MSP stack, preserve authoritative systems where they work well, and fill workflow or management gaps where tooling is weak or inconsistent.",
  },
  {
    question: "Does the first deployment still require some manual setup?",
    answer:
      "Yes. Each MSP still needs a one-time bootstrap step to configure GitHub OIDC trust to Azure and grant the deployment identity the Azure and Microsoft Graph permissions needed for deployment and AOIFMSP admin bootstrap.",
  },
  {
    question: "Should my first deployment be production?",
    answer:
      "Usually no. The recommended first deployment is a test environment so the MSP can validate branding, AOIFMSP admin bootstrap, connector imports, and live backend behavior before hardening the production posture.",
  },
];

const azureRegions = [
  "eastus",
  "eastus2",
  "centralus",
  "southcentralus",
  "westus",
  "westus2",
  "westus3",
  "northcentralus",
  "canadacentral",
  "canadaeast",
  "uksouth",
  "westeurope",
  "northeurope",
  "australiaeast",
  "southeastasia",
];

const wizardFieldMeta = {
  mspName: {
    label: "MSP Name",
    description: "The full MSP display name used in the AOIFMSP shell, branding API payload, and the first hosted experience after deployment.",
  },
  mspAbbreviation: {
    label: "MSP Abbreviation",
    description: "A short fallback brand label used when the logo or wordmark is unavailable or when the UI needs a compact identifier.",
  },
  location: {
    label: "Azure Region",
    description: "The Azure region used for the deployment record and the primary AOIFMSP resources for this environment.",
  },
  resourceGroupName: {
    label: "Resource Group Name",
    description: "The Azure resource group that will hold the AOIFMSP platform resources for this environment.",
  },
  namePrefix: {
    label: "Name Prefix",
    description: "A short alphanumeric prefix used when building Azure resource names. Use at least 3 meaningful characters.",
  },
  environmentName: {
    label: "Environment Name",
    description: "The environment label passed into deployment, usually `test`, `dev`, or `prod`.",
  },
  bootstrapAdminValue: {
    label: "Bootstrap Admin Identity",
    description: "The first AOIFMSP administrator to place into the `AOIFMSP Admins` group. Choose either UPN or Entra object ID mode.",
  },
  primaryColor: {
    label: "Primary Color",
    description: "The main brand color used for emphasis, primary actions, and AOIFMSP identity accents after deployment.",
  },
  secondaryColor: {
    label: "Secondary Color",
    description: "The secondary accent color used for highlights, supporting states, and warmer contrast moments in the shell.",
  },
  surfaceColor: {
    label: "Surface Color",
    description: "The base shell surface/background color for the branded AOIFMSP experience.",
  },
  logoMarkPath: {
    label: "Logo Mark Path",
    description: "Optional repo-relative path to a square or compact logo mark file committed into the repository before deployment.",
  },
  logoWordmarkPath: {
    label: "Wordmark Path",
    description: "Optional repo-relative path to a horizontal wordmark file committed into the repository before deployment.",
  },
};

const state = {
  view: "overview",
  wizard: {
    mspName: "Contoso MSP",
    mspAbbreviation: "AOI",
    location: "eastus",
    resourceGroupName: "rg-aoifmsp-test-eastus",
    namePrefix: "aoi",
    environmentName: "test",
    bootstrapMode: "upn",
    bootstrapAdminValue: "admin@contoso.com",
    primaryColor: "#10634a",
    secondaryColor: "#ff8a3d",
    surfaceColor: "#f4efe7",
    logoMarkPath: "branding/mark.png",
    logoWordmarkPath: "branding/wordmark.svg",
    profile: "test",
  },
};

function getGithubRepoBase() {
  const hostname = window.location.hostname;
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (hostname.endsWith("github.io") && pathParts.length > 0) {
    const owner = hostname.split(".")[0];
    const repo = pathParts[0];
    return `https://github.com/${owner}/${repo}`;
  }
  return "";
}

function repoLinks() {
  const base = getGithubRepoBase();
  return [
    { label: "Repository README", href: base ? `${base}/blob/main/README.md` : "#" },
    { label: "Deployment Preparation Doc", href: base ? `${base}/blob/main/docs/deployment-preparation.md` : "#" },
    { label: "Deployment Automation Doc", href: base ? `${base}/blob/main/docs/deployment-automation.md` : "#" },
    { label: "Security Baseline", href: base ? `${base}/blob/main/docs/security-baseline.md` : "#" },
  ];
}

function profileSettings() {
  if (state.wizard.profile === "production") {
    return {
      storagePublicNetworkAccess: "Disabled",
      keyVaultPublicNetworkAccess: "Disabled",
      appServicePublicNetworkAccess: "Disabled",
      guidance:
        "Use a production-hardened posture with private connectivity planning, stricter security review, and private runner considerations if publish paths cannot reach the app privately from GitHub-hosted runners.",
    };
  }

  return {
    storagePublicNetworkAccess: "Enabled",
    keyVaultPublicNetworkAccess: "Enabled",
    appServicePublicNetworkAccess: "Enabled",
    guidance:
      "Use the lowest-friction test posture first so the MSP can validate the platform shell, admin bootstrap, connector strategy, and live backend behavior before hardening.",
  };
}

function workflowInputs() {
  const settings = profileSettings();
  return [
    ["location", state.wizard.location],
    ["resource_group_name", state.wizard.resourceGroupName],
    ["name_prefix", state.wizard.namePrefix],
    ["environment_name", state.wizard.environmentName],
    ["storage_public_network_access", settings.storagePublicNetworkAccess],
    ["key_vault_public_network_access", settings.keyVaultPublicNetworkAccess],
    ["app_service_public_network_access", settings.appServicePublicNetworkAccess],
    [state.wizard.bootstrapMode === "upn" ? "bootstrap_admin_user_principal_name" : "bootstrap_admin_object_id", state.wizard.bootstrapAdminValue],
    ["msp_name", state.wizard.mspName],
    ["msp_abbreviation", state.wizard.mspAbbreviation],
    ["brand_primary_color", state.wizard.primaryColor],
    ["brand_secondary_color", state.wizard.secondaryColor],
    ["brand_surface_color", state.wizard.surfaceColor],
    ["brand_logo_mark_path", state.wizard.logoMarkPath || "(optional)"],
    ["brand_logo_wordmark_path", state.wizard.logoWordmarkPath || "(optional)"],
  ];
}

function helpIcon(text) {
  return `<span class="docs-help" tabindex="0" data-tooltip="${escapeHtml(text)}">?</span>`;
}

function fieldHeader(key) {
  const meta = wizardFieldMeta[key];
  return `<span class="docs-field__label">${meta.label}${helpIcon(meta.description)}</span>`;
}

function checklistCard(title, items) {
  return `
    <article class="docs-card">
      <h3>${title}</h3>
      <ul class="docs-checklist">
        ${items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </article>
  `;
}

function secretCard(name, source, note) {
  return `
    <article class="docs-card docs-card--tight">
      <p class="eyebrow">Secret</p>
      <h3>${name}</h3>
      <p><strong>Where it comes from:</strong> ${source}</p>
      <p>${note}</p>
    </article>
  `;
}

function renderOverview() {
  return `
    <section class="docs-scene__section">
      <div class="docs-section-heading">
        <p class="eyebrow">What AOIFMSP Does</p>
        <h2>One platform over the MSP stack</h2>
        <p>AOIFMSP helps MSPs connect PSA, RMM, documentation, Microsoft Graph, and custom APIs into one governed platform without blindly duplicating healthy tool behavior.</p>
      </div>
      <div class="docs-card-grid">
        ${platformAreas.map((area) => `<article class="docs-card"><h3>${area.title}</h3><p>${area.body}</p></article>`).join("")}
      </div>
      <div class="docs-split">
        <article class="docs-card docs-card--accent">
          <p class="eyebrow">Purpose</p>
          <h3>Normalize, automate, and govern</h3>
          <p>The platform is designed to reduce swivel-chair operations, turn imported APIs into governed platform actions, and give technicians and platform admins one consistent operating model.</p>
        </article>
        <article class="docs-card">
          <p class="eyebrow">Deployment Model</p>
          <h3>Clone, configure, deploy</h3>
          <p>The intended path is: MSP-owned repo, GitHub Actions, Azure OIDC, branded deployment, AOIFMSP Admins bootstrap, then connector onboarding and action review.</p>
        </article>
      </div>
    </section>
  `;
}

function renderPrepare() {
  return `
    <section class="docs-scene__section">
      <div class="docs-section-heading">
        <p class="eyebrow">Before You Deploy</p>
        <h2>Preparation checklist</h2>
        <p>The cleanest first deployment comes from treating Azure, GitHub, and operator readiness as one preflight step instead of learning them mid-run.</p>
      </div>
      <div class="docs-card-grid docs-card-grid--checklist">
        ${checklistCard("MSP Tenant", [
          "Choose the MSP Microsoft 365 tenant that will host AOIFMSP.",
          "Know which identity will become the first AOIFMSP administrator.",
          "Confirm GDAP relationships already exist for the client tenants you plan to manage.",
        ])}
        ${checklistCard("Azure", [
          "Pick the subscription and environment naming convention.",
          "Choose a naming prefix with at least 3 strong alphanumeric characters.",
          "Decide whether the first deployment is a test or production-shaped environment.",
        ])}
        ${checklistCard("GitHub", [
          "Use an MSP-owned clone or fork of the repository.",
          "Enable GitHub Actions.",
          "Prepare repository or environment secrets for Azure OIDC deployment.",
        ])}
        ${checklistCard("Branding", [
          "Prepare the MSP name, abbreviation, and brand colors.",
          "Commit optional logo files into the repo before deployment.",
          "Use the deployment workflow inputs to apply branding on first publish.",
        ])}
      </div>
      <article class="docs-card">
        <p class="eyebrow">Required Secrets</p>
        <h3>GitHub repository or environment secrets</h3>
        <div class="docs-pill-row">
          <span class="docs-pill">AZURE_CLIENT_ID</span>
          <span class="docs-pill">AZURE_TENANT_ID</span>
          <span class="docs-pill">AZURE_SUBSCRIPTION_ID</span>
          <span class="docs-pill">AZURE_PRINCIPAL_OBJECT_ID (recommended)</span>
        </div>
      </article>
      <div class="docs-card-grid docs-card-grid--checklist">
        ${secretCard("AZURE_CLIENT_ID", "The client/application ID of the Microsoft Entra app or service principal used by GitHub OIDC to deploy AOIFMSP.", "Create or identify the deployment app registration first, then copy its Application (client) ID from Microsoft Entra or Azure portal.")}
        ${secretCard("AZURE_TENANT_ID", "The Microsoft Entra tenant ID for the tenant that owns the deployment identity and Azure subscription.", "This is usually the MSP's primary tenant ID and is visible in Microsoft Entra overview or Azure portal subscription context.")}
        ${secretCard("AZURE_SUBSCRIPTION_ID", "The Azure subscription that will host the AOIFMSP resources.", "Copy this from the target subscription in Azure portal or `az account show`.")}
        ${secretCard("AZURE_PRINCIPAL_OBJECT_ID", "The object ID of the deployment service principal in Microsoft Entra. This is optional but recommended.", "Use it when you want deployment RBAC assignment to be deterministic without relying on runtime lookup inside the workflow.")}
      </div>
    </section>
  `;
}

function wizardField(key, inner) {
  return `<label class="docs-field">${fieldHeader(key)}${inner}</label>`;
}

function textInput(key) {
  return `<input class="docs-input" data-input="${key}" value="${escapeAttribute(state.wizard[key])}" />`;
}

function colorInput(key) {
  return `
    <div class="docs-color-field">
      <input class="docs-input" data-input="${key}" value="${escapeAttribute(state.wizard[key])}" />
      <input class="docs-color-input" type="color" data-color="${key}" value="${escapeAttribute(normalizeColorValue(state.wizard[key]))}" />
    </div>
  `;
}

function selectInput(key, options) {
  return `
    <select class="docs-input" data-input="${key}">
      ${options.map((option) => `<option value="${option}"${state.wizard[key] === option ? " selected" : ""}>${option}</option>`).join("")}
    </select>
  `;
}

function renderDeploy() {
  const settings = profileSettings();
  return `
    <section class="docs-scene__section" id="wizard">
      <div class="docs-section-heading">
        <p class="eyebrow">Guided Deployment</p>
        <h2>Workflow input wizard</h2>
        <p>Use this to prepare the values for the GitHub Actions <code>Deploy Platform</code> workflow before you start the run.</p>
      </div>
      <div class="docs-wizard">
        <div class="docs-wizard__form">
          <div class="docs-card docs-card--tight">
            ${wizardField("environmentName", `
              <div class="docs-segmented">
                <button class="${state.wizard.profile === "test" ? "docs-segmented__button docs-segmented__button--active" : "docs-segmented__button"}" data-profile="test" type="button">Test</button>
                <button class="${state.wizard.profile === "production" ? "docs-segmented__button docs-segmented__button--active" : "docs-segmented__button"}" data-profile="production" type="button">Production</button>
              </div>
            `)}
          </div>
          <div class="docs-form-grid">
            ${wizardField("mspName", textInput("mspName"))}
            ${wizardField("mspAbbreviation", textInput("mspAbbreviation"))}
            ${wizardField("location", selectInput("location", azureRegions))}
            ${wizardField("resourceGroupName", textInput("resourceGroupName"))}
            ${wizardField("namePrefix", textInput("namePrefix"))}
            ${wizardField("environmentName", textInput("environmentName"))}
          </div>
          <div class="docs-card docs-card--tight">
            ${wizardField("bootstrapAdminValue", `
              <div class="docs-segmented">
                <button class="${state.wizard.bootstrapMode === "upn" ? "docs-segmented__button docs-segmented__button--active" : "docs-segmented__button"}" data-bootstrap-mode="upn" type="button">UPN</button>
                <button class="${state.wizard.bootstrapMode === "objectId" ? "docs-segmented__button docs-segmented__button--active" : "docs-segmented__button"}" data-bootstrap-mode="objectId" type="button">Object Id</button>
              </div>
              ${textInput("bootstrapAdminValue")}
            `)}
          </div>
          <div class="docs-form-grid">
            ${wizardField("primaryColor", colorInput("primaryColor"))}
            ${wizardField("secondaryColor", colorInput("secondaryColor"))}
            ${wizardField("surfaceColor", colorInput("surfaceColor"))}
            ${wizardField("logoMarkPath", textInput("logoMarkPath"))}
            ${wizardField("logoWordmarkPath", textInput("logoWordmarkPath"))}
          </div>
        </div>
        <div class="docs-wizard__summary">
          <article class="docs-card docs-card--accent">
            <p class="eyebrow">Deployment Posture</p>
            <h3>${state.wizard.profile === "production" ? "Production-hardened" : "Test-friendly"}</h3>
            <p>${settings.guidance}</p>
          </article>
          <article class="docs-card">
            <p class="eyebrow">Workflow Inputs</p>
            <div class="docs-kv-list">
              ${workflowInputs().map(([label, value]) => `<div class="docs-kv"><strong>${label}</strong><span>${escapeHtml(String(value))}</span></div>`).join("")}
            </div>
          </article>
          <article class="docs-card">
            <p class="eyebrow">Run Order</p>
            <ol class="docs-steps">
              <li>Set the Azure OIDC secrets in GitHub.</li>
              <li>Commit logo assets into the repo if you want them applied on first load.</li>
              <li>Run <code>Deploy Platform</code> and paste the workflow input values from this wizard.</li>
              <li>Open the workflow summary links and validate branding, backend reachability, and AOIFMSP admin bootstrap.</li>
            </ol>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderSecurity() {
  return `
    <section class="docs-scene__section">
      <div class="docs-section-heading">
        <p class="eyebrow">Security Direction</p>
        <h2>Microsoft-aligned production posture</h2>
        <p>AOIFMSP is designed to support low-friction test deployment while still keeping a clear path to a hardened production deployment model.</p>
      </div>
      <div class="docs-card-grid docs-card-grid--checklist">
        ${checklistCard("Identity", [
          "Use GitHub OIDC for deployment.",
          "Use managed identity for the runtime.",
          "Bootstrap AOIFMSP Admins in the MSP tenant as part of deployment.",
        ])}
        ${checklistCard("Network", [
          "Test can run with public access enabled.",
          "Production should follow the security baseline for restricted public network access and private connectivity where applicable.",
          "GitHub-hosted runners may need to give way to private runners if publish targets become private-only.",
        ])}
        ${checklistCard("Storage and Secrets", [
          "Prefer Entra-authenticated access over storage keys.",
          "Use Key Vault for secret material, with purge protection and baseline governance for production.",
          "Keep static frontend publishing on authenticated blob upload instead of account keys.",
        ])}
      </div>
    </section>
  `;
}

function renderFaq() {
  return `
    <section class="docs-scene__section">
      <div class="docs-section-heading">
        <p class="eyebrow">Frequently Asked Questions</p>
        <h2>Common deployment and platform questions</h2>
      </div>
      <div class="docs-faq-list">
        ${faqItems.map((item) => `<article class="docs-card"><h3>${item.question}</h3><p>${item.answer}</p></article>`).join("")}
      </div>
    </section>
  `;
}

function captureFocus() {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLSelectElement || active instanceof HTMLTextAreaElement)) {
    return null;
  }

  const inputKey = active.dataset.input || active.dataset.color || "";
  if (!inputKey) {
    return null;
  }

  return {
    selector: active.dataset.input ? `[data-input="${active.dataset.input}"]` : `[data-color="${active.dataset.color}"]`,
    start: active.selectionStart,
    end: active.selectionEnd,
  };
}

function restoreFocus(snapshot) {
  if (!snapshot) {
    return;
  }

  const next = document.querySelector(snapshot.selector);
  if (!(next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement || next instanceof HTMLSelectElement)) {
    return;
  }

  next.focus();
  if ((next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) && snapshot.start !== null && snapshot.end !== null) {
    next.setSelectionRange(snapshot.start, snapshot.end);
  }
}

function render(preserveFocus = false) {
  const focusSnapshot = preserveFocus ? captureFocus() : null;
  const scene = document.getElementById("scene");
  const repoLink = document.getElementById("repoLink");
  const repoLinksHost = document.getElementById("repoLinks");
  const repoBase = getGithubRepoBase();

  if (repoLink) {
    repoLink.href = repoBase || "#";
  }

  if (repoLinksHost) {
    repoLinksHost.innerHTML = repoLinks().map((link) => `<a href="${link.href}">${link.label}</a>`).join("");
  }

  document.querySelectorAll(".docs-nav__item").forEach((button) => {
    button.classList.toggle("docs-nav__item--active", button.dataset.view === state.view);
  });

  if (!scene) {
    return;
  }

  switch (state.view) {
    case "prepare":
      scene.innerHTML = renderPrepare();
      break;
    case "deploy":
      scene.innerHTML = renderDeploy();
      break;
    case "security":
      scene.innerHTML = renderSecurity();
      break;
    case "faq":
      scene.innerHTML = renderFaq();
      break;
    default:
      scene.innerHTML = renderOverview();
      break;
  }

  wireInteractions();
  restoreFocus(focusSnapshot);
}

function wireInteractions() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.onclick = () => {
      state.view = button.dataset.view;
      render();
    };
  });

  document.querySelectorAll("[data-profile]").forEach((button) => {
    button.onclick = () => {
      state.wizard.profile = button.dataset.profile;
      state.wizard.environmentName = state.wizard.profile === "production" ? "prod" : "test";
      render();
    };
  });

  document.querySelectorAll("[data-bootstrap-mode]").forEach((button) => {
    button.onclick = () => {
      state.wizard.bootstrapMode = button.dataset.bootstrapMode;
      render();
    };
  });

  document.querySelectorAll("[data-input]").forEach((input) => {
    input.oninput = (event) => {
      const key = input.dataset.input;
      state.wizard[key] = event.target.value;
      render(true);
    };
    input.onchange = (event) => {
      const key = input.dataset.input;
      state.wizard[key] = event.target.value;
      render(true);
    };
  });

  document.querySelectorAll("[data-color]").forEach((input) => {
    input.oninput = (event) => {
      const key = input.dataset.color;
      state.wizard[key] = event.target.value;
      render(true);
    };
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(String(value));
}

function normalizeColorValue(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#10634a";
}

render();
