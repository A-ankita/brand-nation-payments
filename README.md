# Brand Nation — Vercel Razorpay test backend

This is a **separate Node.js serverless project**. It does **not** change your current GitHub Pages storefront. The repository currently uses static HTML/CSS/JS and Google Drive Apps Script product photos.

## 1. Security first
- Rotate the Razorpay TEST secret previously shared in chat before configuring the backend.
- Do not paste secret keys into ChatGPT, frontend JS, GitHub, or commits.
- `.env` is ignored; `.env.example` contains placeholders only.
- The browser receives the test **key ID**, never the secret.

## 2. Deploy to Vercel
1. Create a new GitHub repository (e.g. `brand-nation-payments`) and upload this directory. **Do not replace your existing `brand-nation` repo.**
2. In Vercel: Add New → Project → Import the new repository → Framework Preset **Other** → Deploy.
3. Project Settings → Environment Variables: set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (rotated), `PRODUCT_CATALOG_JSON`, and `ALLOWED_ORIGIN=https://brand-nation.in` for Production/Preview/Development as appropriate. Redeploy.
4. Use the generated `https://YOUR-PROJECT.vercel.app` URL. Avoid pointing `brand-nation.in` at Vercel, since your live site is hosted on GitHub Pages.
5. For local development, install Node.js 20+, run `npm install`, copy `.env.example` to `.env` and fill it locally, then run `npx vercel dev`. Run `npm test` for validation.

## 3. Endpoints
`POST /api/create-order` JSON body: `{"items":[{"id":"checked-shirts","quantity":1,"size":"M"}]}`.
- The backend calculates the amount from `PRODUCT_CATALOG_JSON`, never from a browser-supplied amount. The sample catalog prices are provisional and must be reviewed before live checkout.
- Returns `order_id`, `amount` (paise), `currency`, and public `key_id`.

`POST /api/verify-payment` JSON body: `{"razorpay_payment_id":"...","razorpay_order_id":"...","razorpay_signature":"..."}`.
- Verifies HMAC SHA-256 with timing-safe comparison and fetches payment/order details from Razorpay.
- `paid:true` only for captured payment. `authorized` is **not** fulfilled.

## 4. Test checkout
After deployment, open `https://YOUR-PROJECT.vercel.app/checkout-example.html`. The test checkout is wired to one sample product. Follow Razorpay's official Test Mode payment instructions. Test cancellation, failed payment, tampered signature and invalid cart.

## 5. Integrating the existing storefront
- Load `https://checkout.razorpay.com/v1/checkout.js` in the existing `index.html`.
- Adapt the sample button code to send cart items using the **stable catalog IDs** defined in the backend, not raw Google Drive photo IDs without pricing.
- Set `API_BASE` to your Vercel URL; keep `ALLOWED_ORIGIN=https://brand-nation.in`.
- Display final server-confirmed amount, and ensure the cart/checkout UI is accessible on mobile.

## 6. Not production-ready yet
- This package **does not create database tables**, COD orders, shipping labels, stock reservations, order records, or an admin dashboard. Add a durable backend database before accepting real orders.
- A payment signature verifies authenticity, **not** fulfilment or persistence. Implement idempotent webhook processing and durable order state before going live; never fulfil based only on a browser response.
- Apply authentication/admin controls, rate limiting, fraud protections, delivery fees, refund policies, shipping/tax calculation, and product availability checks before production.
- Google Drive images remain unchanged. A Drive image is not automatically a sellable SKU: each product/variant must have a stable ID, accurate server price and inventory.
