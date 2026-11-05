# Xarun Market

Independent storefront and order administration using PostgreSQL, email/password accounts and Brevo transactional email.

## Configure

Copy .env.example to .env only if you do not already have .env. The existing local .env includes a generated admin password. Keep it private.

Set these values in .env locally and in your hosting provider's environment variables:

- DATABASE_URL — your PostgreSQL connection string, with the SSL options provided by your database host.
- APP_URL — the full public origin, for example https://your-store.example. Use http://localhost:3000 locally.
- ADMIN_EMAIL and ADMIN_PASSWORD — administrator credentials. Use a unique password of 12–128 characters.
- BREVO_API_KEY — your Brevo transactional API key.
- BREVO_SENDER_EMAIL — an email address verified in Brevo.
- BREVO_SENDER_NAME — the sender name, normally Xarun Market.

The included email values are placeholders. Configure the sender and its domain in Brevo before sending live email. API reference: https://developers.brevo.com/reference/send-transac-email

## Install and run

Use Node 22.13 or newer.

1. Run pnpm install.
2. Set DATABASE_URL in .env.
3. Run pnpm db:migrate.
4. Configure Brevo and APP_URL.
5. Run pnpm dev and open http://localhost:3000.

Both development and deployment use PostgreSQL. Migrations apply once, inside a transaction protected by a database lock.

## Customer access

Customers select Create account at /account and enter their email. Brevo sends a verification link. They open the link and choose their store password to verify ownership. They can then sign in and purchase.

Forgot password sends a reset link. Resend verification email helps customers who missed their first email. Links expire after 30 minutes and work once. Saving a password invalidates existing customer sessions. Passwords are salted and hashed, sessions use HttpOnly cookies, and login/email requests are rate limited.

Customers and admins both sign in at /account. The server recognizes the configured admin email and password and sends the admin to /admin; customers see their orders. Opening /admin without an admin session returns to the shared sign-in page. Admin password changes are made through the environment settings.

## Deploy to Netlify

Push this directory to your repository, then connect it to Netlify. netlify.toml defines the build and routing. Configure all the variables above in Netlify for the functions, run database migrations from your local machine against the intended database, then deploy.

Run pnpm test to check the flows using an embedded PostgreSQL engine and mocked Brevo delivery. Live delivery requires valid Brevo credentials and sender configuration.

## Import existing orders

The two orders exported from the previous hosted store are saved locally in .local/legacy-orders.json. This private export is excluded from Git.

1. Run pnpm db:migrate against your intended PostgreSQL database.
2. Edit .local/order-email-map.json. For each order number, enter the customer's email only after you have established the rightful owner. Empty values keep that order visible to the admin only.
3. Run pnpm db:import. It preserves order numbers, dates, items, totals, payment methods and status. Repeating it avoids duplicate orders.
4. Customers register and verify the mapped email. Matching imported orders become visible in their account. For already verified customers, rerun pnpm db:import after adding mappings.

The export contains the two orders visible when it was taken. Export any orders created on the previous host afterward before switching traffic. Old sign-in sessions and credentials are not used by the new app. The previous identity provider did not store customer emails with these orders, so ownership mapping needs store-owner review.

Keep the private export separate from the repository. It is needed when importing from another computer.
