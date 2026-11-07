const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function sendOrderConfirmation(order) {
  const email = order?.customer?.email;
  if (typeof email !== 'string' || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) return false;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM || 'Brand Nation <orders@brand-nation.in>';
  if (!key) throw new Error('RESEND_API_KEY not configured');
  const items = Array.isArray(order.items) ? order.items : [];
  const lines = items.map(item => '<li>' + escapeHtml(item.id) + ' — Size: ' + escapeHtml(item.size || 'N/A') + ' — Quantity: ' + escapeHtml(item.quantity) + '</li>').join('');
  const amount = (Number(order.amount_paise) / 100).toLocaleString('en-IN', {style:'currency',currency:'INR'});
  const html = '<h2>Thank you for shopping with Brand Nation!</h2><p>We have received your payment.</p><p><strong>Order:</strong> ' + escapeHtml(order.razorpay_order_id) + '</p><ul>' + lines + '</ul><p><strong>Total paid:</strong> ' + escapeHtml(amount) + '</p><p>For help, WhatsApp +91 81306 87619.</p>';
  const response = await fetch('https://api.resend.com/emails', {method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'bn-order-'+order.razorpay_order_id},body:JSON.stringify({from,to:[email],subject:'Brand Nation — Payment confirmed '+order.razorpay_order_id,html})});
  if (!response.ok) throw new Error('Resend rejected confirmation email (HTTP '+response.status+')');
  return true;
}
