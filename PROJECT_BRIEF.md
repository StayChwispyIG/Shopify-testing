# FlowOptions — Claude Code Build Script

A Shopify custom-product-options app, positioned against Infinite Options (ShopPad) with a
stronger differentiator: **multi-condition conditional logic + dynamic-price bundling**, with
a visual rule builder in the merchant admin.

Copy the prompt in **Section 2** into Claude Code to kick off the build. Sections 1 and 3 are
context/reference — keep them in the repo (e.g. as `PROJECT_BRIEF.md`) so Claude Code can
re-read them in later sessions.

---

## 1. Project Brief (save as `PROJECT_BRIEF.md` in repo root)

**Product name:** FlowOptions (placeholder — rename freely)

**One-liner:** A Shopify app that lets merchants add unlimited custom product options
(text, dropdown, swatch, checkbox, date, number) PLUS a visual, multi-condition rule builder
for conditional logic and dynamically-priced bundles — going beyond the single-trigger
show/hide logic and flat-fee bundling that competitors like Infinite Options (ShopPad) offer.

**Target competitor:** Infinite Options by ShopPad Inc. (apps.shopify.com/custom-options)
- Their conditional logic: one trigger → one show/hide effect
- Their bundling: attach product + flat upcharge
- Their admin UI for rules: table/row based, not visual

**Core differentiators to build:**
1. Multi-condition rules: AND/OR combinations across multiple option selections
2. Rule chains: one rule can trigger multiple effects (show/hide fields, apply price deltas,
   auto-select bundled products) in a single evaluation pass
3. Dynamic bundle pricing: bundle price recalculates based on which options/add-ons are
   selected, not a flat add-on fee
4. Visual rule builder: flowchart/node-based UI in the admin (not table rows)
5. Rule templates: prebuilt patterns merchants can clone and adjust

**MVP scope (v1):**
- Option types: text, number, dropdown, checkbox, radio, color/image swatch, date picker
- Option sets assignable to products/collections/store-wide
- Conditional logic engine (multi-condition, AND/OR, chained effects)
- Bundle add-ons with dynamic pricing
- **Quantity stepper on the option block** — lets a shopper add more than 1 customized unit
  in a single add-to-cart action (e.g. "3 engraved mugs, same text"), instead of relying on
  Shopify's native per-variant quantity field. Merchant can configure min/max/default and
  step increment per Option Set.
- Storefront rendering via Shopify theme app extension (Online Store 2.0 blocks)
- Line-item properties to carry selections through cart → checkout → order
- Merchant admin: option set builder + visual rule builder
- Basic order-view surfacing of selected options (address the "packing slip" pain point
  competitors get flagged for — make selections crystal clear on the order detail page)

**Out of scope for v1:** POS support, XLSX import/export, multi-language, AR/3D preview,
per-unit customization on multi-quantity add-to-cart (each unit shares one set of selections
in v1).

**Tech stack (standard modern Shopify app, 2026):**
- Shopify CLI + the official Remix app template (`shopify app init`)
- Polaris React for the embedded admin UI
- Prisma + a hosted Postgres (or SQLite for local dev) for storing option sets/rules
- Shopify Theme App Extension for storefront rendering (App Blocks, Online Store 2.0)
- Shopify Admin GraphQL API for product/variant data and line-item properties
- Webhooks (via Remix routes) for orders/create, app/uninstalled, products/update
- Billing via Shopify Billing API (recurring app charge)

**Quantity behavior:** Simple multiplier mode only for v1 — all units in one add-to-cart
action share the same customization/selections. The quantity stepper multiplies price and
sets the cart line-item quantity accordingly; it does not spawn per-unit fields. (Per-unit
customization, e.g. 3 mugs with 3 different names, is a possible v2 feature — flagged as
out of scope below so the data model doesn't need to support it yet.)

**Data model (starting point):**
- `OptionSet` — belongs to shop, has many `OptionField`s, assigned to products/collections
- `OptionField` — type, label, required, position, belongs to `OptionSet`
- `OptionChoice` — for dropdown/swatch/checkbox/radio fields, includes price delta
- `Rule` — belongs to `OptionSet`, has many `RuleCondition`s and `RuleEffect`s, `logicType` (AND/OR)
- `RuleCondition` — references an `OptionField`/`OptionChoice`, an operator, and a value
- `RuleEffect` — type (show/hide/priceDelta/selectBundleItem), target, value
- `Bundle` — belongs to `OptionSet`, has many `BundleItem`s with base + conditional pricing

---

## 2. Prompt to paste into Claude Code

```
I'm building a Shopify app called FlowOptions. Read PROJECT_BRIEF.md in this repo for full
context before doing anything else.

Scaffold this app using Shopify's official Remix app template via the Shopify CLI
(`npm init @shopify/app@latest` or `shopify app init`), with Prisma for the database and
Polaris for the admin UI. Use TypeScript throughout.

Do this in phases, and stop for my review after each phase:

PHASE 1 — Scaffold & data model
- Initialize the Remix app via Shopify CLI
- Set up Prisma schema for: Shop, OptionSet, OptionField, OptionChoice, Rule, RuleCondition,
  RuleEffect, Bundle, BundleItem (see PROJECT_BRIEF.md data model section)
- Set up local SQLite for dev, with migration path to Postgres noted in README
- Get the app running locally and connected to a dev store via Shopify CLI

PHASE 2 — Admin: Option Set builder
- Build the Polaris-based admin UI for creating/editing Option Sets
- Support all MVP field types: text, number, dropdown, checkbox, radio, swatch, date
- Support assigning an Option Set to specific products, collections, or the whole store
  (use the Admin GraphQL API for product/collection pickers)
- Support per-choice price deltas
- Add quantity stepper settings to the Option Set: enable/disable, min, max, default, step
  increment

PHASE 3 — Admin: Visual rule builder
- Build a node/flowchart-based rule builder (evaluate whether a library like React Flow
  fits, or hand-roll something simpler — your call, explain the tradeoff)
- A rule = one or more conditions (field/choice + operator + value, combinable with AND/OR)
  producing one or more effects (show/hide another field, apply a price delta, auto-select
  a bundle item)
- Include 3-4 starter rule templates merchants can clone
- Write the rule evaluation engine as a pure, well-tested function (conditions + fields in,
  list of active effects out) so it can run identically in the admin preview and storefront

PHASE 4 — Storefront rendering
- Build a Theme App Extension (Online Store 2.0 App Block) that renders the assigned
  Option Set on the product page
- Wire it to the rule evaluation engine (client-side) so conditional show/hide and price
  updates happen live as the shopper makes selections
- Add a quantity stepper to the block (configurable min/max/default/step per Option Set,
  set in the admin builder from Phase 2). Quantity is a simple multiplier in v1: all units
  added in one action share the same selections. Update the displayed total price live as
  quantity changes (base price + option deltas + bundle pricing, all × quantity).
- Serialize selections into line-item properties so they survive add-to-cart → checkout,
  and pass the chosen quantity into the add-to-cart call so the cart line reflects it
  correctly (not just quantity 1 with a note)
- Handle dynamic bundle pricing: recalculate displayed price as selections change

PHASE 5 — Orders & webhooks
- Handle orders/create webhook to store/display selections cleanly on the order detail
  page in the admin (make this clearer than competitors' packing-slip complaints)
- Handle app/uninstalled cleanup

PHASE 6 — Billing & polish
- Add Shopify Billing API integration with a single recurring plan for MVP
- Add empty states, loading states, and basic onboarding flow in the admin
- Write a README covering local dev setup, deployment, and the rule engine's condition/
  effect model for future contributors

For each phase: explain your key implementation decisions before writing code, then
implement, then tell me how to test it locally. Don't move to the next phase until I
confirm the current one works.
```

---

## 3. Notes for using this with Claude Code

- Run this from an empty project directory — Claude Code will scaffold into it.
- You'll need a Shopify Partner account and a development store connected via
  `shopify app init` / `shopify app dev` for local testing.
- If you already have a Partner org and dev store, tell Claude Code the store handle up
  front so it can wire up `shopify.app.toml` correctly.
- The phased approach above is intentional — reviewing after each phase (especially the
  rule engine in Phase 3) will save you from rework, since the storefront rendering in
  Phase 4 depends entirely on that engine's shape.
