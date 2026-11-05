import Razorpay from 'razorpay';
import {randomUUID} from 'node:crypto';
import {prepare, priceCart, getKeys} from './_shared.js';

export default async function handler(req,res) {
  if (!prepare(req,res)) return;
  try {
    const {total, normalized} = priceCart(req.body?.items);
    const razorpay = new Razorpay(getKeys());
    const receipt = `bn_${randomUUID().replaceAll('-','').slice(0,24)}`;
    const order = await razorpay.orders.create({amount:total,currency:'INR',receipt,notes:{cart:JSON.stringify(normalized).slice(0,240)}});
    return res.status(200).json({order_id:order.id,amount:order.amount,currency:order.currency,key_id:process.env.RAZORPAY_KEY_ID});
  } catch (err) {
    if (/Invalid|Unavailable|not configured/.test(err.message) && !/credentials/.test(err.message)) return res.status(400).json({error:err.message});
    const code = err?.statusCode || err?.status;
    if (code===401 || code===403) return res.status(401).json({error:'Payment gateway authentication failed'});
    console.error('Razorpay create-order error:',err.message);
    return res.status(500).json({error:'Unable to create payment order'});
  }
}
