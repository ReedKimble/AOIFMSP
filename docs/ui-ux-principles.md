# AOIFMSP UI and Interaction Principles

## Purpose

This document defines the user experience philosophy for AOIFMSP across the Workflow Designer and Tenant Administration surfaces.

The core requirement is simple:

- AOIFMSP must be clean, friendly, and intuitive for non-expert operators
- AOIFMSP must not assume users will tolerate an overwhelming expert-first interface and then rely on heavy training to compensate
- AOIFMSP should borrow from good video game UI patterns: digestible chunks, progressive capability exposure, strong default controls, fast muscle-memory paths, and learn-as-you-go interaction design

## Product UX Thesis

Many professional application platforms fail because they present the full eventual complexity of the product up front. They optimize for expert breadth instead of approachable flow.

AOIFMSP should do the opposite:

- Start with a small, understandable set of actions
- Teach new capabilities gradually in context
- Keep common actions in common input locations
- Let advanced users become fast through shortcuts and custom bindings
- Preserve a calm, legible interface even as capability grows

The target interaction model is closer to a well-designed game or creative tool than to a traditional enterprise admin portal.

## Design Principles

### Progressive Disclosure

The UI should reveal complexity in layers.

Rules:

- Show only the next useful decision by default
- Collapse advanced configuration until the user asks for it or the scenario truly requires it
- Group related options into focused panels instead of one giant screen
- Prefer staged setup, inspectors, and contextual popovers over permanent dense sidebars full of controls

### Chunked Learning

The product should teach itself in small pieces.

Rules:

- Introduce concepts when they become relevant
- Use short in-product guidance rather than large documentation dumps
- Teach workflows, tenant management, standards, and alerts as separate capability tracks
- Let users advance from basic actions to more powerful tools through usage, not forced upfront exposure

### Familiar Input Placement

High-frequency actions should live in high-frequency input locations.

Rules:

- Primary action near the main focus region
- Secondary actions in predictable contextual menus
- Global search, command palette, and quick actions accessible from a consistent location
- Keyboard shortcuts for speed, but never as the only path
- Pointer-first flows should remain excellent even without shortcuts

### Context Over Clutter

The UI should bring tools to the user when and where they need them.

Rules:

- Use context menus, inline affordances, radial menus, and focused toolbars where appropriate
- Do not pin every possible tool to the screen at all times
- Prefer one surface with strong context switching over many simultaneous control panes
- Show object-specific actions when an item is selected instead of surfacing every action globally

### Calm Visual Design

The interface should feel welcoming and legible.

Rules:

- Strong hierarchy, spacing, and typography
- Clear states and labels instead of icon-only ambiguity
- Use color to reinforce meaning, not to flood the interface
- Avoid dashboard noise, excessive badges, and dense control walls

### Safe Speed

The UI should be fast for experienced users without becoming dangerous.

Rules:

- Allow fast repeat actions and shortcuts for expert operators
- Add clear confirmations or approval steps for destructive or high-impact actions
- Make the likely outcome of an action visible before execution
- Support undo or compensating recovery flows where possible

## Workflow Designer UX

The Workflow Designer should feel closer to a creative sandbox than to a BPMN editor.

### Core Mental Model

Users should think in terms of:

- Trigger
- Steps
- Decisions
- Results

They should not need to think first in terms of:

- Nested schema internals
- Raw API operations
- Infrastructure details
- Exhaustive properties panels

### Designer Layout Principles

Recommended structure:

- Central canvas for the current workflow chunk
- Minimal primary toolbar
- Context-sensitive inspector for the selected node or edge
- Search-first action picker for adding steps
- Optional mini-map or navigation aids only when the workflow becomes large enough to need them

### Node Interaction Model

Recommended behavior:

- Single click selects
- Double click or primary action opens focused configuration
- Right click or equivalent opens contextual actions
- Drag from clear affordances to connect steps
- Inline quick-add between steps for the most common insert action

### Action Selection

Adding a node should feel lightweight.

Rules:

- Use search-first pickers
- Show curated recommendations before the full catalog
- Prefer plain-language labels over raw API terminology in the first layer
- Let advanced users drill into operation-level details when needed

### Complexity Controls

Large workflows should remain manageable.

Rules:

- Support collapsing sections or grouping nodes
- Emphasize the currently active chunk of the workflow
- Provide guided debug and trace views instead of exposing raw internals first
- Surface warnings and validation inline, near the affected node

### AI in the Designer

AI should reduce design friction, not add a second control system.

Rules:

- AI drafts appear as visible proposals, not hidden changes
- AI suggestions should be reviewable one chunk at a time
- Users should be able to accept, reject, or refine suggested steps inline
- AI should help explain workflows in plain language


## Technician Workspace UX

The Technician Workspace should be the operational heart of AOIFMSP.

It should feel like a mission hub where the technician can stay in flow while moving across tickets, tenants, devices, users, documentation, and workflows.

### Core Workspace Pattern

The technician should always have:

- One primary work object such as a ticket or tenant
- One visible ring of related context
- One clear set of next actions

The UI should avoid forcing the technician to open five unrelated pages just to understand one support issue.

### Ticket-Centered Flow

Tickets should act as the most common anchor.

A ticket workspace should expose:

- Ticket details and queue status
- Related tenant context
- Related devices and users
- Relevant documentation and runbooks
- Recommended workflows and quick actions
- Recent alerts, standards drift, or admin activity that may explain the issue

### Context Panels

Recommended supporting panels:

- Tenant context
- Device context
- User context
- Documentation context
- Workflow context
- Activity timeline

Rules:

- Panels should be collapsible and secondary to the main task
- The user should be able to pin the panels they rely on most
- The most relevant panel should be suggested automatically based on the current object

### Technician Search and Commanding

Technicians need fast context switches.

Requirements:

- Global search across tickets, tenants, devices, users, workflows, and documentation
- Command palette actions such as open ticket, open tenant, run workflow, open documentation, or start offboarding
- Recent-item and related-item jump navigation

### Guided Action Launch

Technicians should be able to launch actions without becoming workflow authors.

Patterns:

- Quick actions for common tasks
- Guided workflow launch forms when parameters are required
- Suggested actions based on ticket or device context
- Clear indication of what will happen before an action is executed

### Source-System Respect

AOIFMSP should unify the workflow of the technician without pretending every source system is identical.

Rules:

- Keep the consolidated view lightweight and task-oriented
- Allow jump-out to PSA, RMM, or documentation source systems when deeper native features are needed
- Make the boundary visible so technicians know whether they are viewing cached AOIFMSP context or editing source-system records
## Tenant Administration UX

Tenant Administration should feel like a trusted operations console, not a maze of admin blades.

### Tenant Home Pattern

Each customer tenant should have a clear home page with:

- Health summary
- Standards and drift summary
- Alerts and outstanding actions
- Recent management activity
- Quick actions
- Data freshness and sync status

The tenant home should answer: "What matters right now, and what should I do next?"

### User Management Pattern

User administration should emphasize common lifecycle tasks.

Primary flows:

- Add user
- Update user basics
- Disable or restore user
- Initiate password reset
- Assign or remove licenses
- Adjust group or role membership where supported
- Offboard user through a guided sequence

Design rules:

- Use task-oriented wizards for risky or multi-step actions
- Show impact summaries before execution
- Surface the most common actions first
- Keep advanced or rare actions behind an explicit expand or more-actions affordance

### Standards and Alerts Pattern

Standards and alerts should guide action, not just display status.

Rules:

- Group related issues into understandable categories
- Show severity, impact, and recommended next action
- Allow one-click navigation from an alert to the affected tenant, user, or standard
- Support bulk operations only after the user understands scope and impact

### Multi-Tenant Operations

Bulk operations across tenants should be powerful but controlled.

Rules:

- Use tenant groups as the primary scoping mechanism
- Always preview scope before execution
- Require stronger confirmation for high-impact multi-tenant actions
- Show partial success and failure clearly after execution

## Input System Philosophy

AOIFMSP should use an input action model inspired by game-engine input systems.

The goal is to separate user intent from specific device bindings.

Examples of actions:

- `select`
- `open-context-menu`
- `primary-action`
- `secondary-action`
- `pan-canvas`
- `zoom-canvas`
- `connect-node`
- `delete-selection`
- `duplicate-selection`
- `open-command-palette`
- `open-quick-actions`

### Why This Matters

An action-map model makes the product easier to personalize and easier to evolve.

Benefits:

- Per-user keyboard and pointer preferences
- More consistent interactions across Workflow Designer and Tenant Administration
- Better accessibility support
- Easier future support for alternative input devices
- Cleaner mental model for shortcuts and rebinding

### Binding Rules

Recommended behavior:

- Provide sensible defaults for keyboard and mouse first
- Allow per-user remapping of shortcuts and selected pointer behaviors where practical
- Separate global bindings from surface-specific bindings
- Prevent dangerous binding conflicts for destructive actions
- Let users reset to defaults easily

### Interaction Modes

The product should not depend on one input style.

Support these modes well:

- Mouse-first and touchpad-first navigation
- Keyboard-accelerated expert use
- Context-menu driven discovery
- Command-palette driven power use

Controller-style or other alternative device support can be considered later, but the action-map architecture should leave room for it.

## Onboarding and Capability Progression

AOIFMSP should teach capabilities gradually like a good game teaches mechanics.

Recommended progression:

1. Start with guided quick wins
2. Introduce common tenant-management actions
3. Introduce simple workflow building
4. Introduce standards and alerts
5. Introduce advanced workflow logic and AI assistance
6. Introduce multi-tenant operations and custom input optimization

### UX Mechanisms

Recommended mechanisms:

- Starter templates
- Empty-state guidance
- Contextual hints
- Short inline tutorials
- Example workflows and example admin tasks
- Progressive feature exposure based on role, usage, or explicit preference

## Accessibility and Personalization

Friendly and intuitive also means adaptable.

Requirements:

- Keyboard accessibility for primary operations
- Clear focus states
- Scalable type and spacing
- High-contrast friendly states
- Reduced-motion support
- Per-user input preferences and shortcut profiles
- Remembered layout and panel preferences where useful

## Architecture Implications

This UI philosophy affects the platform design directly.

The architecture should support:

- Per-user input profiles and UI preferences
- Role-aware feature exposure and progressive disclosure
- Search-first action catalogs with curated recommendations
- Command palette and contextual action APIs
- Saved views for tenants, alerts, and workflow workspaces
- Explicit freshness metadata for cached management data
- Telemetry about UX friction points such as abandoned flows, repeated validation failures, and search miss patterns

## Non-Goals

The UI should not:

- Start as an expert-only control wall
- Expose every connector detail at all times
- Force users into training-heavy workflows just to perform common tasks
- Hide dangerous consequences behind speed shortcuts
- Split basic and advanced users into separate products

## Recommended MVP UX Scope

For MVP, prioritize:

- Clean tenant home pages
- Guided user lifecycle flows
- Search-first workflow action insertion
- Context-sensitive inspectors instead of always-visible complex panels
- Command palette and basic shortcut system
- Per-user input preferences and a first version of rebinding for key workflow actions
- Progressive onboarding for tenant management and workflow creation

