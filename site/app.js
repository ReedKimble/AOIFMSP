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
    </section>
  `;
}

function wizardField(label, inner) {
  return `<label class="docs-field"><span>${label}</span>${inner}</label>`;
}

function wizardInput(key, label) {
  return wizardField(label, `<input class="docs-input" data-input="${key}" value="${state.wizard[key]}" />`);
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
          ${wizardField("Deployment profile", `
            <div class="docs-segmented">
              <button class="${state.wizard.profile === "test" ? "docs-segmented__button docs-segmented__button--active" : "docs-segmented__button"}" data-profile="test" type="button">Test</button>
              <button class="${state.wizard.profile === "production" ? "docs-segmented__button docs-segmented__button--active" : "docs-segmented__button"}" data-profile="production" type="button">Production</button>
            </div>
          `)}
          <div class="docs-form-grid">
            ${wizardInput("mspName", "MSP Name")}
            ${wizardInput("mspAbbreviation", "MSP Abbreviation")}
            ${wizardInput("location", "Azure Region")}
            ${wizardInput("resourceGroupName", "Resource Group Name")}
            ${wizardInput("namePrefix", "Name Prefix")}
            ${wizardInput("environmentName", "Environment Name")}
          </div>
          ${wizardField("Bootstrap admin identity", `
            <div class="docs-segmented">
              <button class="${state.wizard.bootstrapMode === "upn" ? "docs-segmented__button docs-segmented__button--active" : "docs-segmented__button"}" data-bootstrap-mode="upn" type="button">UPN</button>
              <button class="${state.wizard.bootstrapMode === "objectId" ? "docs-segmented__button docs-segmented__button--active" : "docs-segmented__button"}" data-bootstrap-mode="objectId" type="button">Object Id</button>
            </div>
            <input class="docs-input" data-input="bootstrapAdminValue" value="${state.wizard.bootstrapAdminValue}" />
          `)}
          <div class="docs-form-grid">
            ${wizardInput("primaryColor", "Primary Color")}
            ${wizardInput("secondaryColor", "Secondary Color")}
            ${wizardInput("surfaceColor", "Surface Color")}
            ${wizardInput("logoMarkPath", "Logo Mark Path")}
            ${wizardInput("logoWordmarkPath", "Wordmark Path")}
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
              ${workflowInputs().map(([label, value]) => `<div class="docs-kv"><strong>${label}</strong><span>${value}</span></div>`).join("")}
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

function render() {
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

  wireWizard();
}

function wireWizard() {
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
      state.wizard[input.dataset.input] = event.target.value;
      if (input.dataset.input === "environmentName" || input.dataset.input === "namePrefix") {
        state.wizard.resourceGroupName = `rg-aoifmsp-${state.wizard.environmentName}-${state.wizard.location}`;
      }
      render();
    };
  });
}

wireWizard();
render();
