CREATE TABLE IF NOT EXISTS brand_nation_orders (
 razorpay_order_id text PRIMARY KEY,
 receipt text NOT NULL,
 amount_paise integer NOT NULL CHECK (amount_paise > 0),
 currency text NOT NULL DEFAULT 'INR',
 items jsonb NOT NULL,
 customer jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'created',
 razorpay_payment_id text UNIQUE,
 captured_at timestamptz,
 notification_state text NOT NULL DEFAULT 'pending',
 notified_at timestamptz,
 notification_claimed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brand_nation_orders_status_idx ON brand_nation_orders(status);
