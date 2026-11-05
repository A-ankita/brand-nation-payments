import Razorpay from 'razorpay';
import {prepare,verifySignature,getKeys} from './_shared.js';

export default async function handler(req,res) {
  if (!prepare(req,res)) return;
  const {razorpay_payment_id:paymentId,razorpay_order_id:orderId,razorpay_signature:signature}=req.body||{};
  if (![paymentId,orderId,signature].every(x=>typeof x==='string' && x.length>0)) return res.status(400).json({error:'Missing payment verification fields'});
  try {
    const keys=getKeys();
    if (!verifySignature(orderId,paymentId,signature,keys.key_secret)) return res.status(400).json({error:'Invalid payment signature',verified:false});
    const razorpay=new Razorpay(keys);
    const [payment,order]=await Promise.all([razorpay.payments.fetch(paymentId),razorpay.orders.fetch(orderId)]);
    if (payment.order_id!==orderId || payment.currency!=='INR' || payment.amount!==order.amount || !['captured','authorized'].includes(payment.status)) {
      return res.status(409).json({error:'Payment details or status do not match',verified:false});
    }
    if (payment.status!=='captured') return res.status(202).json({verified:true,paid:false,status:payment.status,message:'Payment authorized but not captured; do not fulfil yet'});
    return res.status(200).json({verified:true,paid:true,status:'captured',order_id:orderId,payment_id:paymentId});
  } catch(err) {
    const code=err?.statusCode||err?.status;
    if (code===401||code===403) return res.status(401).json({error:'Payment gateway authentication failed'});
    console.error('Payment verification failed:',err.message);
    return res.status(500).json({error:'Unable to verify payment status'});
  }
}
