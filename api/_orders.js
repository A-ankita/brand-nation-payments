import postgres from 'postgres';
let client;
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured');
  return client ||= postgres(process.env.DATABASE_URL, {max: 3, ssl: 'require'});
}
export function safeCustomer(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const clean = {};
  for (const [key, max] of Object.entries({name:120,phone:20,email:254,address:500,pincode:12})) {
    if (typeof value[key] === 'string') clean[key] = value[key].trim().slice(0,max);
  }
  return clean;
}
export function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export async function notifyOrder(order) {
  const apiKey=process.env.RESEND_API_KEY, from=process.env.ORDER_SENDER_EMAIL, to=process.env.ORDER_NOTIFICATION_EMAIL;
  if (![apiKey,from,to].every(Boolean)) throw new Error('Resend notification configuration missing');
  const items=order.items;
  const customer=order.customer || {};
  const lines=items.map(x=>`<li>${escapeHtml(x.id)} — size ${escapeHtml(x.size || 'N/A')}, quantity ${Number(x.quantity)}, ₹${(Number(x.unitPricePaise)*Number(x.quantity)/100).toFixed(2)}</li>`).join('');
  const fields=Object.entries(customer).map(([k,v])=>`<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`).join('');
  const html=`<h2>Brand Nation — Paid Order</h2><p>Order: ${escapeHtml(order.razorpay_order_id)}</p><p>Payment: ${escapeHtml(order.razorpay_payment_id)}</p><p>Total: ₹${(order.amount_paise/100).toFixed(2)}</p><ul>${lines}</ul>${fields}`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:`Brand Nation paid order ${order.razorpay_order_id}`,html,headers:{'X-Entity-Ref-ID':order.razorpay_order_id}})});
  if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
}
