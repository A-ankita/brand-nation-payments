import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import {db,notifyOrder} from './_orders.js';
import {getKeys} from './_shared.js';

export const config={api:{bodyParser:false}};
async function rawBody(req) {
 const chunks=[];
 for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
 return Buffer.concat(chunks);
}
export default async function handler(req,res) {
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
 const secret=process.env.RAZORPAY_WEBHOOK_SECRET;
 if(!secret) return res.status(503).json({error:'Webhook not configured'});
 const raw=await rawBody(req);
 const signature=req.headers['x-razorpay-signature'];
 const expected=crypto.createHmac('sha256',secret).update(raw).digest('hex');
 if(typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature)||!crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex'))) return res.status(401).json({error:'Invalid signature'});
 let event;
 try {event=JSON.parse(raw.toString('utf8'));}catch{return res.status(400).json({error:'Invalid JSON'});}
 if(event.event!=='payment.captured') return res.status(200).json({ok:true,ignored:true});
 const paymentId=event.payload?.payment?.entity?.id;
 const orderId=event.payload?.payment?.entity?.order_id;
 if(!paymentId||!orderId) return res.status(400).json({error:'Missing payment details'});
 try {
   const razorpay=new Razorpay(getKeys());
   const [payment,rpOrder]=await Promise.all([razorpay.payments.fetch(paymentId),razorpay.orders.fetch(orderId)]);
   if(payment.status!=='captured'||payment.order_id!==orderId||payment.amount!==rpOrder.amount||payment.currency!==rpOrder.currency) return res.status(409).json({error:'Payment mismatch'});
   const sql=db();
   const updated=await sql`UPDATE brand_nation_orders SET status='paid',razorpay_payment_id=${paymentId},captured_at=COALESCE(captured_at,now()) WHERE razorpay_order_id=${orderId} AND amount_paise=${payment.amount} AND currency=${payment.currency} AND (razorpay_payment_id IS NULL OR razorpay_payment_id=${paymentId}) RETURNING *`;
   if(!updated.length) return res.status(409).json({error:'Unknown or inconsistent order'});
   const claimed=await sql`UPDATE brand_nation_orders SET notification_state='sending',notification_claimed_at=now() WHERE razorpay_order_id=${orderId} AND (notification_state='pending' OR (notification_state='sending' AND notification_claimed_at < now()-interval '10 minutes')) RETURNING *`;
   if(!claimed.length) return res.status(200).json({ok:true,notification:'already processed or in progress'});
   try {
     await notifyOrder(claimed[0]);
     await sql`UPDATE brand_nation_orders SET notification_state='sent',notified_at=now() WHERE razorpay_order_id=${orderId}`;
   } catch(err) {
     await sql`UPDATE brand_nation_orders SET notification_state='pending',notification_claimed_at=NULL WHERE razorpay_order_id=${orderId} AND notification_state='sending'`;
     throw err;
   }
   return res.status(200).json({ok:true});
 } catch(err) {
   console.error('Webhook processing error:',err.message);
   return res.status(500).json({error:'Webhook processing failed'});
 }
}
