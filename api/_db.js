import {neon} from '@neondatabase/serverless';

function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(process.env.DATABASE_URL);
}

export async function saveCreatedOrder(order, items, customer = {}) {
  const sql = db();
  const safeCustomer = customer && typeof customer === 'object' && !Array.isArray(customer) ? customer : {};
  await sql`
    INSERT INTO public.brand_nation_orders
      (razorpay_order_id, receipt, amount_paise, currency, items, customer, status)
    VALUES
      (${order.id}, ${order.receipt}, ${order.amount}, ${order.currency},
       ${JSON.stringify(items)}::jsonb, ${JSON.stringify(safeCustomer)}::jsonb, 'created')
    ON CONFLICT (razorpay_order_id) DO NOTHING
  `;
}

export async function markCaptured(orderId, paymentId, amountPaise) {
  const sql = db();
  const rows = await sql`
    UPDATE public.brand_nation_orders
    SET status = CASE WHEN status = 'confirmed' THEN 'confirmed' ELSE 'captured' END,
        razorpay_payment_id = ${paymentId},
        captured_at = COALESCE(captured_at, NOW())
    WHERE razorpay_order_id = ${orderId}
      AND amount_paise = ${amountPaise}
      AND status IN ('created', 'captured', 'confirmed')
      AND (razorpay_payment_id IS NULL OR razorpay_payment_id = ${paymentId})
    RETURNING razorpay_order_id
  `;
  return rows.length === 1;
}

export async function claimConfirmationEmail(orderId) {
  const sql = db();
  const rows = await sql`
    UPDATE public.brand_nation_orders
    SET status = 'confirmation_sending'
    WHERE razorpay_order_id = ${orderId} AND status = 'captured'
    RETURNING razorpay_order_id, amount_paise, currency, items, customer
  `;
  return rows[0] || null;
}

export async function finishConfirmationEmail(orderId, success) {
  const sql = db();
  await sql`
    UPDATE public.brand_nation_orders
    SET status = ${success ? 'confirmed' : 'captured'}
    WHERE razorpay_order_id = ${orderId} AND status = 'confirmation_sending'
  `;
}

