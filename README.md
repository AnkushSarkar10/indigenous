# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Quote requests

The quote-list page includes an item review and contact-details step. Submissions
are validated on the server and saved, with a snapshot of the catalogue item names
and quantities, to `quote_requests`. A confirmation reference is returned only after
the request has been saved. Email delivery and a sales administration inbox are not
configured by this flow.

Before running this version against a database, generate the client and apply the
migrations using the configured `DIRECT_URL`:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

The form requires first name, last name, email, contact number, selected items and
explicit data-use consent. Organisation, address and notes are optional.
A browser-generated submission key prevents duplicate records when a request is
retried after a network failure. No captcha service or verification keys are required.

Run quote validation tests with:

```bash
node --import tsx tests/quote-request.test.ts
```
