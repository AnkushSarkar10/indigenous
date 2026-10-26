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
are validated on the server and saved to `quote_requests`. Each selected item is
stored in `quote_request_items` with a foreign key to `products.id`, its quantity,
and name/SKU snapshots for historical accuracy. Each request has a unique, randomly
generated reference such as `IND-323` (three uppercase letters, a hyphen, and three
digits). It is stored separately from the internal ID and returned only after
the request has been saved. Retries return the same reference. The confirmation
screen displays it prominently and asks the customer to call to confirm the order.
Change `HOMEPAGE_CONTENT.phone` in `app/constants/homepage.ts` to update the phone
number on both the homepage and confirmation screen; a valid number becomes a
click-to-call link on the confirmation screen.
Email delivery and a sales administration inbox are not
configured by this flow.

Before running this version against a database, generate the client and apply the
migrations using the configured `DIRECT_URL`:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

The item migration converts existing JSON item snapshots into related rows before
removing the JSON column. If a saved SKU no longer exists in the catalogue, it
aborts without discarding the original data; restore the matching product and
resolve the failed migration before retrying. Products referenced by quote items
cannot be deleted, and deleting a quote request also deletes its item rows.
The reference migration assigns unique short references to existing requests while
preserving their internal IDs and item relationships.

The form requires first name, last name, email, contact number, selected items and
explicit data-use consent. Organisation, address and notes are optional.
A browser-generated submission key prevents duplicate records when a request is
retried after a network failure. The browser retains the exact serialized payload
and key in memory for identical retries; changing contact fields, notes, consent,
items, quantities or item order creates a new UUID on the next submission.
The server stores a SHA-256 hash of the raw JSON body with the key and returns
HTTP 409 if that key is reused with different bytes, including simultaneous requests.
Existing requests without a stored hash also reject reuse of their old keys.
No captcha service or verification keys are required.

The public quote endpoint limits each client IP to 10 attempts per 10 minutes,
including invalid submissions and retries. Excess attempts return HTTP 429 with
`Retry-After`, before reading the body or accessing the database. Request bodies
are capped at 256 KiB while streaming, including requests without Content-Length
or with a false length; oversized requests return HTTP 413. Incomplete body reads
time out after 15 seconds. These limits are defined in
`server/utils/quote-request-limits.ts`.

Client IPs come from the socket by default. Behind a trusted proxy that overwrites
X-Forwarded-For, set `NUXT_QUOTE_REQUEST_TRUST_PROXY=true`. Do not enable this if
clients can supply that header directly. The bounded rate-limit store is local to
each server process and resets on restart. For multiple workers, replicas or
serverless instances, also enforce a shared rate limit and body-size cap at the
reverse proxy or gateway; the in-process limit is not a deployment-wide quota.

Run all quote tests with:

```bash
node --import tsx --test tests/*.test.ts
```

Migration tests run the SQL against an isolated in-memory PostgreSQL database;
they do not connect to the configured application database.
