# Receipts, Invoices, Localization, and Sales History Roadmap

## Goal

Bring receipt and invoice workflows to a consistent, production-ready level across:

- `web-app` Enterprise
- `frontend` mobile
- backend document and settings contracts

while also fixing:

- invoice creation from an existing sale
- missing translations
- customer visibility in accounting sales history
- post-creation business/store personalization

This roadmap is intentionally grouped because these topics overlap heavily in:

- settings
- branding
- document rendering
- accounting
- POS
- i18n

---

## Current State Summary

### What already works

- Receipt branding fields exist in backend settings:
  - `receipt_business_name`
  - `receipt_footer`
  - `tax_mode`
- Web settings already expose receipt customization.
- Web POS already injects receipt branding into its internal receipt modal.
- Backend effective settings already support store-level overrides for receipt/tax fields.

### Main gaps

- Public receipt link does not use branded receipt fields.
- Mobile does not expose receipt customization cleanly.
- Mobile types do not fully include branded receipt/store fields.
- Invoice creation is mostly a standalone PDF generator, not a real business workflow.
- No proper "create invoice from sale" flow.
- Accounting sales history does not surface the customer clearly enough.
- Some labels and strings remain untranslated or partially hardcoded.
- Store/business personalization after signup is still too limited for professional documents.

---

## Product Decisions To Freeze

### 1. Receipt vs invoice

- `Receipt`
  - generated automatically from a completed sale
  - meant for quick proof of payment
  - printable, shareable, mobile-friendly
- `Invoice`
  - can be created from a sale
  - can also exist as a manual accounting document later if needed
  - includes more formal business identity fields
  - intended for B2B/professional use

### 2. Source of truth

- Branding and tax settings must come from effective store/account settings.
- Web and mobile must render the same business identity for the same store.
- Public/shared receipts must use the same branded values as POS receipts.

### 3. Personalization model

Separate clearly:

- `business legal identity`
- `store/branch identity`
- `document branding`

Suggested model:

- `business_name`
- `store_name`
- `receipt_business_name`
- `invoice_business_name`
- `invoice_header`
- `receipt_footer`
- `invoice_footer`
- `business_address`
- `invoice_address`
- `invoice_prefix`
- `invoice_type`
- `tax_id / registration_number`
- `phone`
- `email`

---

## Workstream A - Receipts

### A1. Unify receipt branding contract

Backend:

- extend effective settings contract so receipt branding is explicit and complete
- confirm fields are store-scoped when relevant
- expose them consistently through `/settings`

Frontend:

- web and mobile must use the same settings fields and same fallback rules

Target fields:

- `receipt_business_name`
- `receipt_footer`
- `tax_mode`
- `currency`
- optionally later:
  - `receipt_logo_url`
  - `receipt_phone`
  - `receipt_email`

### A2. Fix public/shared receipt

Current issue:

- `/api/public/receipts/{sale_id}` uses store name/address, but not branded receipt fields

Target:

- public receipt payload includes:
  - branded business/store name
  - footer
  - payment summary
  - tax summary
  - customer name if allowed
  - optional QR-friendly metadata

### A3. Mobile receipt customization

Add a dedicated receipt section in mobile settings:

- receipt name
- receipt footer
- optionally terminal defaults

Also update mobile TS types:

- `Store`
- `UserSettings`

to include the same receipt fields as web/backend.

### A4. Mobile receipt rendering

Current issue:

- mobile PDF receipt uses `store.name`, not branded receipt name

Target:

- all mobile receipt outputs must use branded effective values
- PDF and share flows must match web/internal/public receipt branding

### A5. Web receipt correctness

Clean up the web receipt renderer so it uses persisted sale values only:

- line totals
- line prices
- discounts
- taxes

Avoid recomputing from possibly stale product data.

### A6. Receipt previews

Add preview capability in settings:

- web preview
- mobile preview

This avoids saving blindly and improves confidence.

---

## Workstream B - Invoices

### B1. Define the invoice model

Today the invoice flow is too local/UI-driven.

Introduce a proper backend invoice model, separate from supplier invoices:

- `invoice_id`
- `account_id`
- `store_id`
- `sale_id` optional
- `customer_id` optional
- `invoice_number`
- `invoice_type`
- `status`
- `issued_at`
- `due_at`
- `currency`
- `subtotal`
- `tax_total`
- `total_amount`
- `items`
- `notes`
- `footer`
- branding snapshot fields

### B2. Create invoice from sale

This is the priority invoice feature.

Target flows:

- from POS after sale
- from dashboard sales list
- from accounting sales history

User action:

- `Create invoice from sale`

Behavior:

- preload customer
- preload sale items
- preload totals/taxes
- generate invoice number
- allow note/footer adjustments
- generate PDF
- optionally mark as sent later

### B3. Manual invoice mode

Phase 2 only:

- allow manual invoice creation without an existing sale

But this should come after `invoice from sale`.

### B4. Invoice personalization

Add invoice-specific settings:

- `invoice_business_name`
- `invoice_address`
- `invoice_footer`
- `invoice_prefix`
- `invoice_type`
- `tax_id`
- `registration_number`
- `invoice_terms`
- `invoice_email`
- `invoice_phone`

### B5. Invoice templates

At minimum support:

- `standard invoice`
- `proforma invoice`

Later:

- `quotation`
- `delivery note`
- `credit note`

### B6. Invoice PDF consistency

Both mobile and web should converge toward one business-driven invoice template.

Long term:

- generate invoice data server-side
- render PDF from stable invoice payload

Short term:

- keep client-side PDF if needed
- but base it on a proper invoice model and shared template contract

---

## Workstream C - Accounting Sales History

### C1. Show customer in sales history

Current issue:

- accounting history does not properly surface the customer

Target in web accounting:

- add customer column in sales history
- display:
  - customer name
  - fallback to "Client divers"
  - optional phone/email later

Target in backend stats/history payload:

- always expose a resolved customer display name

### C2. Actions from sales history

Each sale row should support:

- view receipt
- create invoice
- print receipt
- share receipt

### C3. Filtering

Add filters in accounting history:

- customer
- payment method
- terminal
- store
- period

---

## Workstream D - Localization / i18n Cleanup

### D1. Audit untranslated strings

Run a full audit of hardcoded strings in:

- mobile
- web
- landing if needed

Priority screens:

- POS
- accounting
- settings
- receipts
- invoices
- support/help
- onboarding/signup

### D2. Normalize translation keys

Introduce or complete namespaces for:

- `receipts.*`
- `invoices.*`
- `documents.*`
- `accounting.sales_history.*`
- `settings.receipts.*`
- `settings.invoices.*`

### D3. Fix fallback policy

Current web and mobile i18n defaults should be reviewed so untranslated UI does not silently mix:

- French
- English
- hardcoded literals

Target:

- consistent default language behavior
- no mixed-language screen sections

### D4. Encoding cleanup

There are already signs of mojibake/encoding drift in some UI text.

Need one pass to clean:

- broken accents
- malformed apostrophes
- static labels

---

## Workstream E - Business / Store Personalization

### E1. Rename business/store after creation

User must be able to modify after signup:

- business name
- store name
- store address
- phone
- email

This should be first-class in both web and mobile settings.

### E2. Distinguish account vs store identity

Need explicit rules:

- account/company identity
- branch/store identity

Examples:

- company: `Groupe Diallo`
- store: `Boutique Cocody`
- receipt name: `Boutique Cocody`
- invoice name: `Groupe Diallo`

### E3. Document identity settings

Suggested fields:

- `business_legal_name`
- `brand_name`
- `store_name`
- `invoice_business_name`
- `invoice_address`
- `receipt_business_name`
- `invoice_footer`
- `receipt_footer`
- `invoice_prefix`
- `invoice_type_default`
- `tax_id`
- `registration_number`
- `contact_phone`
- `contact_email`

### E4. Preview and validation

Provide document preview before save:

- receipt preview
- invoice preview

Also validate:

- required fields for professional invoice
- optional vs required legal identifiers by region

---

## Workstream F - Backend Contracts

### F1. Settings schema evolution

Extend backend settings/store schemas to support:

- receipt fields
- invoice fields
- contact/document identity

Prefer:

- store-scoped document branding where needed
- account-level legal identity for company-wide data

### F2. New invoice endpoints

Recommended endpoints:

- `POST /invoices/from-sale/{sale_id}`
- `GET /invoices`
- `GET /invoices/{invoice_id}`
- `POST /invoices`
- `PUT /invoices/{invoice_id}`
- `GET /invoices/{invoice_id}/pdf`

### F3. Sales history payload

Extend accounting sales endpoints so each sale row includes:

- `customer_name`
- `customer_id`
- `receipt_url`
- `can_create_invoice`
- `invoice_id` if already generated

### F4. Public receipt payload

Extend public receipt response to include:

- `receipt_business_name`
- `receipt_footer`
- `tax_total`
- `subtotal_ht`
- `currency`

---

## Workstream G - UI/UX

### G1. Settings information architecture

Split settings into clearer blocks:

- business identity
- store identity
- receipt customization
- invoice customization
- tax and compliance
- terminals

### G2. Document actions

Make document actions easy to find:

- from POS success screen
- from sale history
- from customer history
- from accounting

### G3. Professional feel

Documents should feel enterprise-ready:

- consistent typography
- cleaner totals blocks
- explicit tax lines
- branded headers/footers
- stable numbering

---

## Recommended Implementation Order

### Phase 1 - Receipts foundation

1. unify receipt/store/document types across backend, web, mobile
2. fix public receipt branding
3. add mobile receipt customization
4. make mobile PDF receipt use branded settings
5. fix web receipt renderer to use sale-persisted data only

### Phase 2 - Invoice from sale

1. define backend invoice model
2. add create-from-sale backend flow
3. add action from POS/dashboard/accounting
4. add invoice personalization settings
5. generate invoice PDF from real invoice payload

### Phase 3 - Accounting history

1. add customer in sales history
2. add actions per sale row
3. add filters

### Phase 4 - Localization cleanup

1. audit untranslated/hardcoded strings
2. add missing keys
3. clean encoding issues
4. verify web/mobile language consistency

### Phase 5 - Business identity polish

1. add editable business/store identity after signup
2. separate legal/company/store/document identities
3. add previews and validation

---

## Validation Scenarios

### Receipts

- customize receipt name/footer on web
- print/share from web POS
- open public receipt link
- confirm branding is identical

- customize receipt on mobile
- complete sale on mobile
- export/share PDF
- confirm same branding

### Invoices

- create invoice from completed sale
- customer and items prefilled
- invoice numbering generated
- PDF uses invoice branding and tax data

### Accounting

- open sales history
- customer visible on each sale
- create invoice from history row

### Localization

- switch language on mobile
- switch language on web
- verify receipts/invoices/settings/accounting labels are translated

### Multi-store

- change active store
- confirm receipt/invoice branding changes with store
- confirm accounting history and actions use the right store context

---

## Main Risks To Avoid

- duplicating receipt logic in too many UI components
- keeping invoice generation UI-only without backend persistence
- mixing account identity and store identity
- letting web and mobile drift again on document fields
- translating only visible labels but keeping hardcoded PDF text

---

## Recommended Deliverable Split

If implemented in separate tickets, split into:

1. `receipt branding parity web/mobile/public`
2. `invoice model + create from sale`
3. `accounting sales history customer + actions`
4. `document localization cleanup`
5. `business/store/document identity settings`

