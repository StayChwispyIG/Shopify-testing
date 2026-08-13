# FlowOptions

A Shopify app for custom product options with a visual, multi-condition rule builder and
dynamically-priced bundles. See [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) for full product
context, competitive positioning, and the phased build plan.

Scaffolded from Shopify's official
[React Router app template](https://github.com/Shopify/shopify-app-template-react-router)
(the successor to the now-deprecated Remix template — Remix v2 merged into React Router v7,
and Shopify's CLI no longer offers Remix as a scaffolding option). Admin UI uses
[Polaris web components](https://shopify.dev/docs/api/app-home/polaris-web-components)
(`<s-page>`, `<s-button>`, etc., shipped via App Bridge) rather than the `@shopify/polaris`
React package — this is the template's current default and Shopify's direction for new apps.

## Build status

- [x] **Phase 1** — Scaffold & data model
- [ ] Phase 2 — Admin: Option Set builder
- [ ] Phase 3 — Admin: Visual rule builder
- [ ] Phase 4 — Storefront rendering
- [ ] Phase 5 — Orders & webhooks
- [ ] Phase 6 — Billing & polish

## Quick start

### Prerequisites

- Node.js `>=20.19 <22 || >=22.12` (matches `engines` in `package.json`)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started) (invoked via `npx shopify` / the `npm run` scripts below — no separate global install required)
- A [Shopify Partner account](https://www.shopify.com/partners) and a development store

### Setup

This repo is already scaffolded (Prisma schema, dependencies, and initial migration are
committed). To get a fresh clone running:

```shell
npm install
npm run setup      # prisma generate && prisma migrate deploy
```

### Link the app to your Partner org

The app was scaffolded without an authenticated Shopify session (see "Why the app isn't
linked yet" below), so before running it locally you need to link it to an app record in
your Partner Dashboard / Dev Dashboard:

```shell
npm run config:link
```

This walks you through selecting (or creating) an app in your Partner org and writes the
resulting `client_id` into `shopify.app.toml`.

### Local development

```shell
npm run dev
```

This is `shopify app dev` under the hood. It logs into your Partner account, connects to
your dev store, provisions environment variables, opens a tunnel, and watches for changes.
Press `p` to open the app URL once it's running, then click "Install" on your dev store to
start testing.

### Why the app isn't linked yet

This app was scaffolded in an automated environment without interactive browser access, so
the `client_id` in `shopify.app.toml` is blank and no Partner org/dev store is linked. Run
`npm run config:link` followed by `npm run dev` from your own machine to complete the
one-time authentication and connect it to your dev store — after that, `shopify.app.toml`
will have a real `client_id` and subsequent `npm run dev` runs will reuse that link.

### Authenticating and querying data

To authenticate and query data you can use the `shopify` const that is exported from `/app/shopify.server.js`:

```js
export async function loader({ request }) {
  const { admin } = await shopify.authenticate.admin(request);

  const response = await admin.graphql(`
    {
      products(first: 25) {
        nodes {
          title
          description
        }
      }
    }`);

  const {
    data: {
      products: { nodes },
    },
  } = await response.json();

  return nodes;
}
```

This template comes pre-configured with examples of:

1. Setting up your Shopify app in [/app/shopify.server.ts](https://github.com/Shopify/shopify-app-template-react-router/blob/main/app/shopify.server.ts)
2. Querying data using Graphql. Please see: [/app/routes/app.\_index.tsx](https://github.com/Shopify/shopify-app-template-react-router/blob/main/app/routes/app._index.tsx).
3. Responding to webhooks. Please see [/app/routes/webhooks.tsx](https://github.com/Shopify/shopify-app-template-react-router/blob/main/app/routes/webhooks.app.uninstalled.tsx).

Please read the [documentation for @shopify/shopify-app-react-router](https://shopify.dev/docs/api/shopify-app-react-router) to see what other API's are available.

## Shopify Dev MCP

This template is configured with the Shopify Dev MCP. This instructs [Cursor](https://cursor.com/), [GitHub Copilot](https://github.com/features/copilot) and [Claude Code](https://claude.com/product/claude-code) and [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) to use the Shopify Dev MCP.

For more information on the Shopify Dev MCP please read [the documentation](https://shopify.dev/docs/apps/build/devmcp).

## Deployment

### Application Storage

This app uses [Prisma](https://www.prisma.io/) for all data — Shopify session tokens
(`Session`) as well as FlowOptions' own tables (`Shop`, `OptionSet`, `OptionField`,
`OptionChoice`, `Rule`, `RuleCondition`, `RuleEffect`, `Bundle`, `BundleItem`; see
`prisma/schema.prisma` for the full schema and inline comments explaining each model).
Local dev uses [SQLite](https://www.sqlite.org/index.html) (`prisma/dev.sqlite`, gitignored)
for zero-setup local development.

SQLite is fine for local dev and low-traffic single-instance production use, but this app
is expected to outgrow it (concurrent writes from multiple merchants, hosting on a
multi-instance/serverless platform). **Migration path to Postgres:**

1. Provision a Postgres instance (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app), [Digital Ocean](https://www.digitalocean.com/products/managed-databases-postgresql), [Amazon RDS](https://aws.amazon.com/rds/postgresql/)).
2. In `prisma/schema.prisma`, change the `datasource` block:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL` in your environment (e.g. `.env` locally, or your host's secrets/env
   config in production) to the Postgres connection string.
4. Delete `prisma/migrations/` and regenerate a fresh initial migration against Postgres
   (SQLite and Postgres migration SQL aren't compatible with each other), or use
   `prisma migrate diff` if you need to preserve existing SQLite data — most apps at this
   stage don't have production data yet and can just regenerate:
   ```shell
   rm -rf prisma/migrations
   npx prisma migrate dev --name init
   ```
5. A few schema details assume SQLite's loose typing and will want tightening once on
   Postgres: `OptionField.settingsJson` and `BundleItem.conditionalPriceRulesJson` are
   plain `String` columns holding JSON (SQLite has no native JSON type) — on Postgres these
   can become a proper `Json` column type for queryability. Enums (`OptionFieldType`,
   `RuleOperator`, etc.) already use Prisma's `enum`, which maps to SQLite as a `String`
   with an app-level check but becomes a real native enum type on Postgres — no schema
   change needed, just better enforcement.

Other database options (MySQL, MongoDB, Redis for caching) are also supported by Prisma —
see the [datasource provider docs](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#datasource) — but Postgres is the recommended target given the relational,
foreign-key-heavy shape of the rule engine's data model.

### Build

Build the app by running the command below with the package manager of your choice:

Using yarn:

```shell
yarn build
```

Using npm:

```shell
npm run build
```

Using pnpm:

```shell
pnpm run build
```

## Hosting

When you're ready to set up your app in production, you can follow [our deployment documentation](https://shopify.dev/docs/apps/launch/deployment) to host it externally. From there, you have a few options:

- [Google Cloud Run](https://shopify.dev/docs/apps/launch/deployment/deploy-to-google-cloud-run): This tutorial is written specifically for this example repo, and is compatible with the extended steps included in the subsequent [**Build your app**](tutorial) in the **Getting started** docs. It is the most detailed tutorial for taking a React Router-based Shopify app and deploying it to production. It includes configuring permissions and secrets, setting up a production database, and even hosting your apps behind a load balancer across multiple regions.
- [Fly.io](https://fly.io/docs/js/shopify/): Leverages the Fly.io CLI to quickly launch Shopify apps to a single machine.
- [Render](https://render.com/docs/deploy-shopify-app): This tutorial guides you through using Docker to deploy and install apps on a Dev store.
- [Manual deployment guide](https://shopify.dev/docs/apps/launch/deployment/deploy-to-hosting-service): This resource provides general guidance on the requirements of deployment including environment variables, secrets, and persistent data.

When you reach the step for [setting up environment variables](https://shopify.dev/docs/apps/deployment/web#set-env-vars), you also need to set the variable `NODE_ENV=production`.

## Gotchas / Troubleshooting

### Database tables don't exist

If you get an error like:

```
The table `main.Session` does not exist in the current database.
```

Create the database for Prisma. Run the `setup` script in `package.json` using `npm`, `yarn` or `pnpm`.

### Navigating/redirecting breaks an embedded app

Embedded apps must maintain the user session, which can be tricky inside an iFrame. To avoid issues:

1. Use `Link` from `react-router` or `@shopify/polaris`. Do not use `<a>`.
2. Use `redirect` returned from `authenticate.admin`. Do not use `redirect` from `react-router`
3. Use `useSubmit` from `react-router`.

This only applies if your app is embedded, which it will be by default.

### Webhooks: shop-specific webhook subscriptions aren't updated

If you are registering webhooks in the `afterAuth` hook, using `shopify.registerWebhooks`, you may find that your subscriptions aren't being updated.

Instead of using the `afterAuth` hook declare app-specific webhooks in the `shopify.app.toml` file. This approach is easier since Shopify will automatically sync changes every time you run `deploy` (e.g: `npm run deploy`). Please read these guides to understand more:

1. [app-specific vs shop-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions)
2. [Create a subscription tutorial](https://shopify.dev/docs/apps/build/webhooks/subscribe/get-started?deliveryMethod=https)

If you do need shop-specific webhooks, keep in mind that the package calls `afterAuth` in 2 scenarios:

- After installing the app
- When an access token expires

During normal development, the app won't need to re-authenticate most of the time, so shop-specific subscriptions aren't updated. To force your app to update the subscriptions, uninstall and reinstall the app. Revisiting the app will call the `afterAuth` hook.

### Webhooks: Admin created webhook failing HMAC validation

Webhooks subscriptions created in the [Shopify admin](https://help.shopify.com/en/manual/orders/notifications/webhooks) will fail HMAC validation. This is because the webhook payload is not signed with your app's secret key.

The recommended solution is to use [app-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions) defined in your toml file instead. Test your webhooks by triggering events manually in the Shopify admin(e.g. Updating the product title to trigger a `PRODUCTS_UPDATE`).

### Webhooks: Admin object undefined on webhook events triggered by the CLI

When you trigger a webhook event using the Shopify CLI, the `admin` object will be `undefined`. This is because the CLI triggers an event with a valid, but non-existent, shop. The `admin` object is only available when the webhook is triggered by a shop that has installed the app. This is expected.

Webhooks triggered by the CLI are intended for initial experimentation testing of your webhook configuration. For more information on how to test your webhooks, see the [Shopify CLI documentation](https://shopify.dev/docs/apps/tools/cli/commands#webhook-trigger).

### Incorrect GraphQL Hints

By default the [graphql.vscode-graphql](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) extension for will assume that GraphQL queries or mutations are for the [Shopify Admin API](https://shopify.dev/docs/api/admin). This is a sensible default, but it may not be true if:

1. You use another Shopify API such as the storefront API.
2. You use a third party GraphQL API.

If so, please update [.graphqlrc.ts](https://github.com/Shopify/shopify-app-template-react-router/blob/main/.graphqlrc.ts).

### Using Defer & await for streaming responses

By default the CLI uses a cloudflare tunnel. Unfortunately cloudflare tunnels wait for the Response stream to finish, then sends one chunk. This will not affect production.

To test [streaming using await](https://reactrouter.com/api/components/Await#await) during local development we recommend [localhost based development](https://shopify.dev/docs/apps/build/cli-for-apps/networking-options#localhost-based-development).

### "nbf" claim timestamp check failed

This is because a JWT token is expired. If you are consistently getting this error, it could be that the clock on your machine is not in sync with the server. To fix this ensure you have enabled "Set time and date automatically" in the "Date and Time" settings on your computer.

### Using MongoDB and Prisma

If you choose to use MongoDB with Prisma, there are some gotchas in Prisma's MongoDB support to be aware of. Please see the [Prisma SessionStorage README](https://www.npmjs.com/package/@shopify/shopify-app-session-storage-prisma#mongodb).

### Unable to require(`C:\...\query_engine-windows.dll.node`).

Unable to require(`C:\...\query_engine-windows.dll.node`).
The Prisma engines do not seem to be compatible with your system.

query_engine-windows.dll.node is not a valid Win32 application.

**Fix:** Set the environment variable:

```shell
PRISMA_CLIENT_ENGINE_TYPE=binary
```

This forces Prisma to use the binary engine mode, which runs the query engine as a separate process and can work via emulation on Windows ARM64.

## Resources

React Router:

- [React Router docs](https://reactrouter.com/home)

Shopify:

- [Intro to Shopify apps](https://shopify.dev/docs/apps/getting-started)
- [Shopify App React Router docs](https://shopify.dev/docs/api/shopify-app-react-router)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [Shopify App Bridge](https://shopify.dev/docs/api/app-bridge-library).
- [Polaris Web Components](https://shopify.dev/docs/api/app-home/polaris-web-components).
- [App extensions](https://shopify.dev/docs/apps/app-extensions/list)
- [Shopify Functions](https://shopify.dev/docs/api/functions)

Internationalization:

- [Internationalizing your app](https://shopify.dev/docs/apps/best-practices/internationalization/getting-started)
