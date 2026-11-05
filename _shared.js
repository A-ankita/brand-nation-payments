import crypto from 'node:crypto';

export function originHeaders(req) {
  const origin = req.headers.origin || '';
  const allowed = (process.env.ALLOWED_ORIGIN || 'https://brand-nation.in').split(',').map(s => s.trim());
  return origin && allowed.includes(origin) ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  } : { Vary: 'Origin' };
}
export function prepare(req, res) {
  Object.entries(originHeaders(req)).forEach(([k,v]) => res.setHeader(k,v));
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  if (req.method !== 'POST') { res.setHeader('Allow','POST, OPTIONS'); res.status(405).json({error:'Method not allowed'}); return false; }
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGIN || 'https://brand-nation.in').split(',').map(s => s.trim());
  if (origin && !allowed.includes(origin)) { res.status(403).json({error:'Origin not allowed'}); return false; }
  return true;
}
export function catalogue() {
  const parsed = JSON.parse(process.env.PRODUCT_CATALOG_JSON || '{}');
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw Error('Invalid catalog');
  return parsed;
}
export function priceCart(items, catalog = catalogue()) {
  if (!Array.isArray(items) || !items.length || items.length > 30) throw Error('Invalid cart');
  let total = 0;
  const normalized = items.map(item => {
    if (!item || typeof item.id !== 'string' || !Object.hasOwn(catalog,item.id)) throw Error('Unavailable product');
    const product = catalog[item.id];
    const quantity = item.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw Error('Invalid quantity');
    const price = product.pricePaise;
    if (!Number.isSafeInteger(price) || price < 100) throw Error('Product price not configured');
    const size = typeof item.size === 'string' ? item.size.trim() : '';
    const validSizes = Array.isArray(product.sizes) ? product.sizes : ['M','L','XL','XXL'];
    if (size && !validSizes.includes(size)) throw Error('Invalid size');
    total += price * quantity;
    return {id:item.id, quantity, size, unitPricePaise:price};
  });
  if (!Number.isSafeInteger(total) || total < 100 || total > 100000000) throw Error('Invalid order total');
  return {total,normalized};
}
export function verifySignature(orderId,paymentId,signature,secret) {
  if (![orderId,paymentId,signature,secret].every(x=>typeof x==='string' && x.length>0)) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex'));
}
export function getKeys() {
  const key_id = process.env.RAZORPAY_KEY_ID, key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw Error('Razorpay credentials not configured');
  return {key_id,key_secret};
}
