# Task: Build the Production-Ready Inventory Management UI for Kauntact

## Objective

Implement the inventory management interface for Kauntact using the existing frontend architecture, design system, backend APIs, Prisma models, inventory services, and lifecycle rules.

The goal is a coherent inventory workflow that takes an operator from print production through warehouse inwarding to stock visibility and order packing.

**This is an integration task, not an invitation to redesign the backend.** Inspect the repository before making changes. Use the existing backend contracts and theme. Do not invent endpoints, request fields, response shapes, enums, permissions, or lifecycle transitions.

## 1. Mandatory repository reconnaissance

Before writing UI code, inspect:

- Frontend application structure, routing, layouts, authentication, and admin navigation.
- Existing design tokens, CSS variables, typography, spacing, radii, shadows, colors, component primitives, icons, buttons, inputs, tables, drawers, and dialogs.
- Existing loading, error, toast, confirmation, and form-validation patterns.
- API client, authentication headers, error handling, query caching, and invalidation conventions.
- Prisma schema and migrations for `PrintBatch`, `PrintBatchReceipt`, product variants, products, components, inventory, serialized tags, and packing-related models.
- Admin inventory controllers, routes, DTOs, validation schemas, and service methods.
- `adminExportPrintBatchManifest` and the existing batch creation, dispatch, inwarding, inventory, and packing endpoints.
- Existing frontend inventory or packing pages that should be extended instead of duplicated.
- Existing tests and scripts that establish the expected lifecycle.

Search the codebase for actual API route registrations and corresponding frontend callers. Confirm every HTTP method, path, parameter, request payload, response structure, and status enum against source code.

Create a short implementation map before coding. Then implement the UI.

## 2. Theme and visual design requirements

The existing application theme is the source of truth.

- Reuse the existing theme provider, design tokens, typography, color variables, and component primitives.
- Do not introduce a new theme, parallel color palette, generic admin-dashboard template, or unrelated design language.
- Preserve the existing visual identity and established interaction patterns.
- Use the existing font and typography scale. Do not replace the application's font.
- Use consistent spacing, restrained borders, and the existing radius and shadow system.
- Avoid excessive cards, gradients, decorative charts, large hero headings, unnecessary taglines, and oversized empty space.
- Prioritize operational clarity, information density, and rapid repetitive workflows.
- Use existing icons and button variants.
- Provide clear visual distinction between pending, in-progress, completed, defective, cancelled, and reconciliation-required states using the application's existing semantic status styles.
- Make the pages responsive, with particular attention to narrow warehouse devices and mobile packing workflows.
- Use accessible labels, keyboard interaction, focus states, contrast, and confirmation for destructive or irreversible operations.

Do not use mock screenshots, static sample inventory, or hardcoded production data as a substitute for backend integration.

## 3. Information architecture

Create or extend three primary inventory pages:

1. **Production Batches**
2. **Warehouse Inwarding**
3. **Inventory Overview / Bundle Health**

Keep the order-packing workflow separate, using its existing route and API contracts.

Use the existing admin layout and navigation. Integrate these pages into the current navigation system rather than creating a disconnected mini-application.

---

## 4. Page A — Production Batches

### Purpose

Manage print jobs from batch creation through manifest export and dispatch.

This page represents stock that is being produced, not stock that is already available to sell.

### Main list

Build a compact, searchable, filterable table or list using actual backend data.

Show the fields that the API actually provides, prioritizing:

- Batch identifier and barcode.
- Product and variant.
- Physical inventory SKU.
- Requested quantity.
- Received quantity.
- Accepted quantity.
- Defective quantity.
- Outstanding quantity, calculated only where the backend contract and lifecycle semantics make that calculation valid.
- Current batch status.
- Creation or dispatch timestamps, where available.
- Available actions based on current batch status.

Do not assume every field exists in every list response. Fetch batch details through the existing detail endpoint if required.

### Batch creation

Use the existing batch-creation API and its validation rules.

- Select a valid product variant through backend data.
- Display the correct inventory SKU and variant information.
- Capture the required production quantity.
- Capture supported print specifications only where the backend contract requires or accepts them.
- Preserve the immutable variant/product snapshot semantics already implemented by the backend.
- Display validation errors beside the relevant inputs.
- Prevent duplicate submissions while a request is in progress.
- Show the created batch's actual identifier and status after success.

Do not derive SKU values from product names or array positions.

### Manifest export

Integrate the existing `adminExportPrintBatchManifest` functionality through its registered HTTP endpoint.

The manifest contains the historical print-job information established by the backend, including sequence numbers, batch barcode, resolved variant artwork URL, dimensions, material, and finish where available.

- Use the backend-generated manifest.
- Do not reconstruct historical print data from the current product catalog.
- Provide a clear export action.
- Handle expired URLs, authorization failures, and export errors using existing application conventions.
- Do not claim the printer received or printed the manifest merely because it was exported.

### Dispatch

Keep dispatch separate from batch creation.

- Display the current batch status and the action allowed by the backend.
- Require explicit operator confirmation before recording dispatch.
- Prevent dispatch when the backend rejects the transition.
- Refresh the batch detail and list after a successful dispatch.
- Do not invent a dispatch status or bypass backend transition rules.

### Batch details

Provide a detail page, drawer, or existing project-standard detail view showing:

- Immutable product/variant snapshot.
- Requested, received, accepted, defective, and outstanding quantities.
- Batch status and lifecycle timestamps.
- Manifest/export history if available.
- Chronological receipt history.
- Defective tag numbers and inwarding notes when supplied by the API.

Make it possible to move from a batch directly into the inwarding workflow without losing the selected batch context.

---

## 5. Page B — Warehouse Inwarding

### Purpose

Record physical deliveries accurately, including partial deliveries, defects, shortages, and subsequent receipts.

This is an operational receiving interface, not a generic inventory edit form.

### Workflow

1. Select or scan a dispatched/eligible print batch.
2. Fetch the current authoritative batch details.
3. Display the expected quantity, previously received quantity, and remaining quantity.
4. Enter the quantities for the current physical delivery.
5. Record defects and optional tag-level defect information supported by the API.
6. Review the receipt summary.
7. Confirm inwarding.
8. Display the server-confirmed receipt result.
9. Refresh batch and inventory data.

### Batch selection

Use the actual batch lookup/list APIs and eligibility rules.

Show enough information to distinguish similar batches: identifier, SKU, variant, expected quantity, received quantity, remaining quantity, and status where available.

Do not let a batch's existence alone imply that it can be inwarded.

### Receipt form

Use the exact payload accepted by the current inwarding endpoint.

The implemented audit model includes:

- `receiptNumber`
- `idempotencyKey`
- `receivedQuantity`
- `acceptedQuantity`
- `defectiveQuantity`
- `missingQuantity`
- `defectiveTagNumbers`
- `receivedBy`
- `notes`
- `receivedAt`

These are audit/model fields, not a guarantee that all must be supplied by the client. Inspect the controller and DTO to establish which fields the client must send and which are generated server-side.

Use the backend's established quantity semantics. In particular, do not assume missing quantities are always additive to outstanding quantities or that they should immediately close a batch. Verify how the service validates and records them.

Validation requirements:

- Reject invalid, negative, fractional, or internally inconsistent quantities according to the backend contract.
- Enforce any maximums based on the current outstanding quantity and permitted receipt rules.
- Clearly distinguish physically received units from accepted units and defective units.
- Show tag-level defect entry only when supported.
- Make notes optional or required according to the actual API.
- Use a new idempotency key for a new receipt operation.
- Reuse the same idempotency key when retrying the same operation after a timeout or uncertain network outcome.
- Do not generate a new key merely because the operator clicks retry.

### Defect handling

The backend supports deterministic defective-tag selection when individual barcodes are not provided. Preserve that behavior.

- If operators can scan or enter specific defective tag numbers, submit them through the supported field.
- If the API allows count-only defect recording, explain the established deterministic allocation policy in the UI or contextual help.
- After submission, show the actual defective tag numbers returned by the backend.
- Never imply that a tag is defective or revoked until the server confirms the result.

### Duplicate and partial receipts

The backend implements idempotency using receipt records and returns duplicate-request information.

- Handle duplicate responses as safe reconciliation outcomes, not as new receipts.
- Show whether the response represents a new receipt or an already-recorded receipt, using the actual response fields.
- Refresh quantities from the backend after every successful or duplicate response.
- Support subsequent receipts while the batch remains eligible.
- Reflect partial and final receipt statuses using the actual enum values.
- Do not optimistically increment stock in the UI.
- If a request times out, retrieve the batch/receipt state before allowing the operator to submit another receipt.

### Receipt history

Show chronological receipt records, including quantities, notes, defect information, receipt identifiers, operator, and timestamp where exposed by the API.

Keep audit history immutable in the UI. Do not provide edit/delete controls unless the backend explicitly supports an audited correction workflow.

### Inwarding UX

Make this page efficient for warehouse use:

- Minimize navigation between selecting a batch and confirming a receipt.
- Keep the quantity summary visible while entering data.
- Use clear numeric inputs and inline validation.
- Prevent accidental double submission.
- Show progress during network operations.
- Provide a clear recovery state when a request fails or its result is uncertain.
- Support keyboard entry and mobile touch targets.

---

## 6. Page C — Inventory Overview / Bundle Health

### Purpose

Show the actual stock position and explain which physical components constrain sellable product and bundle availability.

### Inventory summary

Use the existing inventory/catalog endpoints and their real response types.

Show available metrics only when their definitions are supported by the backend:

- Physical units received or currently held.
- Accepted/usable units.
- Reserved units.
- Damaged units.
- Sellable units.
- Production quantities still outstanding.
- Low-stock or unavailable status where the backend defines a threshold.

Do not infer these quantities from batch totals alone if the authoritative inventory ledger or inventory service provides the actual result.

Do not present `quantityAccepted`, current physical stock, and sellable inventory as interchangeable values.

### Physical SKU inventory

Display physical inventory by the stable SKU used by the inventory system, including `ProductComponent.inventorySku` where relevant.

Show the product/variant mapping and stock values returned by the backend.

If inventory is calculated from serialized tag records, preserve that calculation and avoid introducing a second client-side source of truth.

### Bundle availability

The backend calculates bundle availability using component-level stock. The established calculation is:

`min(floor(component stock / required component quantity))`

for every required inventory component, subject to the actual backend's eligibility and reservation rules.

For example, if a bundle requires two stickers per pack and there are 75 usable stickers, that component can support 37 complete packs before considering any other required components.

The actual sellable bundle quantity is constrained by the scarcest required component.

The UI should:

- Show each bundle's calculated sellable quantity.
- Explain which required component is the bottleneck.
- Show the component's available quantity and per-bundle requirement where the API exposes them.
- Distinguish calculated bundle availability from physical bundle stock.
- Respect reservations and other constraints implemented by the backend.
- Refresh calculations after inwarding and inventory-affecting operations.

Never manually edit a calculated bundle stock number. If a bundle cannot be sold, display the actual reason provided by backend data where possible.

### Filters and detail views

Provide useful search/filter controls based on available data, such as SKU, product/variant, stock status, or bundle.

Use backend filtering and pagination where available. Do not fetch an unbounded inventory dataset simply to filter it in the browser.

Keep the overview operational: identify what is available, what is constrained, and what needs replenishment without decorative or misleading analytics.

---

## 7. Separate order-packing workflow

Do not merge customer-order packing into warehouse inwarding.

Reuse the existing packing route, APIs, session model, and serialized tag allocation logic.

The packing interface must:

- Show the order and its required physical items.
- Expand bundles into their actual physical components.
- Exclude non-serialized packaging components from serialized QR allocation.
- Track required, confirmed, pending, and remaining allocations separately.
- Treat backend-confirmed allocations as authoritative.
- Prevent duplicate tag allocation.
- Reconcile the session with the backend after a timeout, conflict, or scan error.
- Avoid calculating confirmed progress using `Math.max(localCount, backendCount)` or other logic that can hide inconsistent state.
- Finalize packing only when the backend confirms all requirements are satisfied.

Keep the scanning experience mobile-first and focused. Avoid the cluttered modal approach when a dedicated workspace fits the existing application architecture.

---

## 8. Backend integration rules

These rules are mandatory across all pages.

1. Use the existing authenticated API client.
2. Inspect actual route registrations and controller DTOs before writing API calls.
3. Reuse existing types and service functions; do not create duplicate inventory abstractions.
4. Do not hardcode products, variants, SKUs, quantities, statuses, or endpoint paths.
5. Do not use product names, array positions, or mutable prices as identity.
6. Use stable database IDs for entities and backend-defined SKU values for physical inventory.
7. Keep the backend authoritative for all stock calculations and lifecycle transitions.
8. Use existing query caching and invalidation conventions.
9. Refresh related batch, receipt, inventory, and bundle queries after successful mutations.
10. Use server responses to reconcile the UI after duplicate requests, timeouts, and conflicts.
11. Follow the project's existing error envelope and validation conventions.
12. Do not log secrets, tokens, payment details, or sensitive user information.
13. Preserve authorization boundaries and existing admin permissions.
14. Do not weaken validation or bypass backend transition checks to make the UI appear successful.

### Known backend behavior to preserve

The implementation summary establishes the following behavior. Verify it in the current source before integration:

- `PrintBatchStatus` includes `PARTIALLY_RECEIVED`, `RECONCILIATION_REQUIRED`, and `CANCELLED`.
- `PrintBatch` tracks `variantId`, `productId`, `quantityRequested`, `quantityReceived`, `quantityAccepted`, `quantityDefective`, and `variantSnapshot`.
- `PrintBatchReceipt` provides an inwarding audit trail and idempotency.
- Accepted units are activated as `IN_STOCK`; defective units are marked `DAMAGED`.
- Deterministically selected defective tags are revoked in the associated `QrTag` records.
- Batch inwarding supports partial deliveries.
- The existing catalog service calculates bundle availability from component-level `inventorySku` stock.
- `adminExportPrintBatchManifest` exports a reproducible historical print manifest.

Do not assume these are the complete API contracts or that the frontend should send every model field.

---

## 9. Shared interaction states

Every page must implement the project's standard UI for:

- Initial loading.
- Refreshing existing data.
- Empty results.
- Search with no matches.
- API/network failure.
- Validation failure.
- Unauthorized access.
- Conflict or invalid lifecycle transition.
- Successful mutation.
- Duplicate/idempotent response.
- Uncertain mutation outcome after timeout.
- Disabled actions with a clear explanation where appropriate.

Do not silently swallow API errors or show success notifications before the server confirms success.

Keep form values when validation fails. Avoid resetting a receipt form when the outcome is uncertain until the backend has been reconciled.

---

## 10. Implementation discipline

- Follow existing component, routing, CSS, and file-naming conventions.
- Extend shared components where appropriate instead of duplicating them.
- Avoid introducing dependencies unless necessary and consistent with the repository.
- Keep business logic out of presentation components.
- Use the repository's existing API service and data-fetching patterns.
- Do not introduce fake progress, arbitrary delays, hardcoded stock, or frontend-only lifecycle transitions.
- Do not alter Prisma schema, migrations, inventory services, or API semantics merely to accommodate the UI.
- If an essential UI capability is not supported by the backend, document the gap rather than inventing an endpoint or simulating success.

## 11. Verification and acceptance criteria

Before declaring completion:

1. Run TypeScript compilation using the repository's existing command.
2. Run the frontend production build.
3. Run relevant existing inventory and batch lifecycle tests if the change affects their integration.
4. Verify the three pages use real backend responses.
5. Verify batch creation, manifest export, and dispatch through the actual supported API.
6. Verify partial receipt, retry with the same idempotency key, defective receipt, and final receipt behavior.
7. Verify the UI displays duplicate receipts without double-counting.
8. Verify inventory and bundle availability refresh after inwarding.
9. Verify calculated bundle stock is never manually edited by the frontend.
10. Verify loading, empty, validation, failure, conflict, and timeout-recovery states.
11. Verify the UI remains consistent with the existing application theme at desktop and mobile widths.
12. Report any API gaps or assumptions that could not be confirmed.

Do not claim tests passed unless they were actually executed successfully.

## Final deliverable

Implement the inventory pages and integrations in the existing application.

At completion, report:
- Files created or changed.
- Existing API routes and response contracts used.
- Implemented page workflows.
- Any backend capability gaps discovered.
- TypeScript/build/test commands executed and their actual results.

Prioritize correctness, theme consistency, and reliable warehouse operations over visual embellishment.