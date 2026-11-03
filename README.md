# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Admin request inbox

Open `/admin` to view quote requests. Access requires the shared team email and
password. There is no public registration, password-reset flow, or login-attempt
limit. Admin pages and APIs are private, uncached and excluded from indexing;
every admin read requires a valid server-verified session.

Set the credentials locally in an interactive terminal:

```bash
pnpm admin:setup
```

The command asks for the shared email and a password of at least 12 characters,
with hidden password input and confirmation. It preserves unrelated `.env`
settings and writes only the email, a salted scrypt password hash, and a random
session secret. No plaintext password is saved. Restart the app after setup.
Run the command again to change the login; changing the email, hash or secret
invalidates previously issued sessions.

For hosting, configure `NUXT_ADMIN_EMAIL`, `NUXT_ADMIN_PASSWORD_HASH`, and
`NUXT_ADMIN_SESSION_SECRET` as private server environment variables, using the
values produced in `.env` by the setup command. Production must use HTTPS;
the session cookie is Secure in production, HTTP-only and SameSite=Strict.
Behind a reverse proxy, preserve the public Host and set X-Forwarded-Proto to
`https` so same-origin login and logout checks see the correct public origin.
Sessions expire after eight hours. Logout removes the current browser's cookie;
rotating credentials invalidates all sessions. Missing configuration disables
admin login rather than enabling any default account.

The inbox shows 25 requests per page, newest first by default, with an oldest-first
option. Search accepts full or partial customer-facing Request IDs such as
`IND-323`, ignores case and surrounding spaces, and searches all saved requests.
Sorting and filtering happen in the database. Dates are displayed in IST.
The inbox checks for updates every five seconds while the tab is visible and
online, preserving the current search, sort order, and page. Returning to the tab
or reconnecting triggers an immediate check. Updates keep the existing rows
visible without a loading flash; temporary connection failures retry automatically.
Polling stops when leaving the inbox, and an expired session returns to sign-in.
Open a request to see customer contact details, address, notes and the product
name/SKU/quantity snapshots saved with the original submission. The inbox is
read-only; it does not edit requests or send emails. No database migration is
needed for admin access.

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
Quote confirmation emails use Resend when enabled. A sales administration inbox
is not configured by this flow.

### Quote confirmation emails

Configure these server-side environment variables (see `.env.example`):

- `RESEND_API_KEY`: a sending-only key; keep this out of public runtime config.
- `NUXT_RESEND_FROM_EMAIL`: the sender customers see.
- `NUXT_RESEND_QUOTE_TEMPLATE_ID`: the published Resend template ID.
- `NUXT_QUOTE_EMAIL_ENABLED=true`: enables queueing emails for new requests.

The current setup uses `Indigenous <onboarding@resend.dev>` for testing. Resend
allows this sender to deliver only to the account owner's email or its simulated
test addresses, such as `delivered@resend.dev`. Customer delivery requires a domain
you own and verify in Resend. Then replace the sender and preferably create a
sending-only key restricted to that domain. No emails are redirected to a test
inbox: the recipient is always the creator's submitted address.

The hosted template is **Indigenous quote confirmation**, alias
`indigenous-quote-confirmation`. It requires exactly these string variables:
`CUSTOMER_NAME`, `REFERENCE`, `ITEMS_HTML`, `ITEMS_NOTE`, and
`CONFIRMATION_PHONE_HTML`. The phone uses `HOMEPAGE_CONTENT.phone`, shared with
the website; valid numbers become tap-to-call links and placeholders remain text.
The phone variable has a fallback for jobs queued before this variable existed.
Edit and publish its
copy in Resend. Item previews escape HTML; lists that exceed Resend's 2,000-character
variable limit include the full saved names, SKUs, and quantities in a UTF-8 text
attachment. The message confirms receipt of a request, with pricing and availability
confirmed separately.

An email job is saved atomically with each new quote in
`quote_confirmation_emails`. Retries of the quote request reuse the saved quote
and job. The request starts delivery with Nitro's `event.waitUntil`; the
`quote-emails` Nitro task also processes pending jobs every minute on the Node
server preset. The server must remain running for scheduled retries. For other
deployment targets, configure a supported scheduler to run this task.

Email API requests time out after 10 seconds. Temporary failures (network errors,
429, and 5xx) retry with backoff and respect `Retry-After`; other provider errors
are marked `failed` for review. Email failures do not discard the quote or change
its confirmation response. Jobs store a fixed payload and use
`quote-confirmation/<internal quote ID>` as their provider idempotency key. After
23 hours from the first attempt, unsent jobs become `review`, so retries do not
silently outlive Resend's 24-hour duplicate protection. Check the provider's email
log before manually retrying any failed or review job. `sent` means accepted by
Resend; final delivery can be checked in its dashboard.

The queue migration does not send confirmations for historical requests.

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
