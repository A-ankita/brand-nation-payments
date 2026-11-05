# Brand Nation order notifications (staged, not active)

1. Provision a managed PostgreSQL database (for example Neon) and run `db/schema.sql` against it.
2. Add `DATABASE_URL` to Vercel Production. Never commit the URL or credentials.
3. Existing variables: `RESEND_API_KEY`, `ORDER_SENDER_EMAIL`, `ORDER_NOTIFICATION_EMAIL`, and Razorpay credentials.
4. Add `RAZORPAY_WEBHOOK_SECRET` in Vercel Production. This is the signing secret configured for the webhook, **not** the Razorpay API key secret.
5. In Razorpay (matching Test or Live mode), configure webhook URL `https://brand-nation-payments.vercel.app/api/razorpay-webhook` and subscribe to `payment.captured`. Enable retries.
6. Merge only after testing checkout, captured-payment webhook, duplicate deliveries, database persistence and receipt email. Existing checkout does not collect customer details; add a checkout customer form before production launch.
7. The branch updates `api/create-order.js` to persist orders before payment. It intentionally fails closed when storage is unavailable. Do not merge until the database is provisioned and end-to-end tests pass.
8. Webhook sends only an internal notification, not a customer receipt. Emails can be retried on provider failures; rare duplicates remain possible after a crash between email delivery and marking the database row sent.
