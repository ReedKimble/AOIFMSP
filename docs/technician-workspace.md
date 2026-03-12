# AOIFMSP Technician Workspace

## Purpose

This document defines the unified technician interface for AOIFMSP.

The technician workspace is the day-to-day operating surface where MSP technicians manage tickets, review device and tenant context, open documentation, execute workflows, and perform customer administration without jumping between disconnected tools unless they choose to.

## Product Intent

AOIFMSP should not stop at automation and tenant administration. It should also provide a consolidated technician-facing interface over the MSP's core operating platforms:

- PSA
- RMM
- Documentation
- Microsoft 365 tenant administration
- AOIFMSP workflows and runbooks

This workspace should feel like a single operating environment, even though the underlying data and actions come from multiple systems.

## Core UX Model

The technician workspace should unify work around the technician's current task context.

Primary contexts:

- Ticket-centered work
- Tenant-centered work
- Device-centered work
- User-centered work
- Alert-centered work

The UI should let the technician move between those contexts without losing their place.

Examples:

- Open a ticket and immediately see the affected tenant, devices, users, related documentation, recent alerts, and recommended workflows.
- Open a device and immediately see open tickets, tenant standards status, documentation, and remediation workflows.
- Open a tenant and immediately see tickets, users, devices, standards, alerts, and quick admin actions.

## Technician Home

The technician landing surface should answer:

- What needs my attention now?
- Which customers or tickets are in trouble?
- What work is assigned to me?
- Which workflows or guided actions can help me move faster?

Recommended sections:

- Assigned tickets and queues
- Critical alerts and standards drift
- Recently viewed tenants, devices, and users
- Suggested workflows and runbooks
- Pending approvals
- Workflow executions requiring review

## Ticket-Centered Workspace

The PSA ticket view should be the most important technician surface.

A ticket should become a hub for related context:

- Ticket details and status
- Customer tenant details
- Related users
- Related devices
- Documentation links and excerpts
- Suggested workflows and quick actions
- Recent admin and workflow activity for the customer

Rules:

- The ticket remains the anchor, but adjacent context should be one click away or visible in supporting panels.
- Technicians should not need to manually search three other systems to gather basic context.
- Workflow execution should be possible directly from the ticket when relevant.

## Device-Centered Workspace

The RMM device view should connect operations and administration.

Show:

- Device identity and health
- Open or recent tickets
- Assigned user or owner when known
- Tenant context
- Relevant documentation
- Device-specific workflows and remediation actions
- Recent standards or compliance signals if applicable

## Tenant-Centered Workspace

The tenant home should not be isolated from the technician's active work.

It should include:

- Open tickets for the tenant
- High-priority devices and users
- Standards and alerts
- Quick administrative actions
- Documentation and runbooks
- Recommended workflows

## Documentation-Centered Workspace

Documentation should be embedded into technician flow, not treated as a separate destination.

Patterns:

- Show relevant documents alongside tickets, tenants, users, and devices
- Support pinning favorite documents or runbooks to tenant views
- Show workflow recommendations next to documentation when procedures are automatable
- Support quick open in the source documentation system when deeper editing is required

## Workflow Integration

Workflows should be accessible in technician context, not only in the workflow designer.

Technician-facing workflow interactions:

- Suggested workflows based on ticket, device, tenant, or alert context
- One-click execution of approved workflows
- Guided launch flows when parameters are required
- Visibility into recent executions related to the current ticket or tenant
- Clear status and outcome summaries after a run

## Context Graph

The technician workspace should treat these relationships as first-class:

- Ticket -> Tenant
- Ticket -> Device
- Ticket -> User
- Tenant -> Users
- Tenant -> Devices
- Tenant -> Documentation
- Tenant -> Alerts
- Tenant -> Standards
- Device -> Documentation
- Workflow -> Ticket, Tenant, Device, User, or Alert launch context

AOIFMSP does not need to materialize a graph database for the MVP, but the UI and storage model should preserve these relationships clearly.

## Search and Navigation

The technician workspace should support fast context jumps.

Required capabilities:

- Global search across tickets, tenants, devices, users, documentation, and workflows
- Contextual search scoped to the current tenant or ticket
- Quick-switch between related records
- Command palette actions such as open ticket, run workflow, open tenant, reset password, or view device

## Action Model

The consolidated technician interface should still use the same underlying AOIFMSP action layer.

That means:

- Ticket actions
- Device actions
- Tenant admin actions
- Workflow launches
- Documentation jumpouts
- Standards remediations

all execute through explicit AOIFMSP actions or governed tool calls, with auditability and approval where required.

## Data Freshness and Ownership

The technician workspace should be explicit about what is cached and what is live.

Recommended model:

- PSA, RMM, and documentation systems remain source systems.
- AOIFMSP stores lightweight searchable summaries and relationship indexes.
- Detail views can fetch fresh data live when needed.
- Each panel should indicate freshness when the data might matter operationally.

## MVP Scope

Recommended first technician release:

- Unified technician home
- Ticket-centered workspace
- Tenant context panel with users, devices, alerts, standards, and quick actions
- Suggested workflow execution from tickets and tenants
- Embedded documentation links and related documents
- Global search across tickets, tenants, users, devices, and workflows

Later:

- Deeper queue management and dispatching
- Rich collaboration features
- Time entry or technician performance reporting
- Offline or advanced multi-monitor workspace customization

