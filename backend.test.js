import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {priceCart,verifySignature} from '../api/_shared.js';
const catalog={shirt:{pricePaise:200000,sizes:['M','L']}};
test('price computed from server catalog, not browser',()=>assert.equal(priceCart([{id:'shirt',quantity:2,size:'M',amount:1}],catalog).total,400000));
test('invalid quantities rejected',()=>assert.throws(()=>priceCart([{id:'shirt',quantity:0}],catalog)));
test('unknown products rejected',()=>assert.throws(()=>priceCart([{id:'fake',quantity:1}],catalog)));
test('HMAC signature valid and invalid',()=>{const sig=crypto.createHmac('sha256','secret').update('order_123|pay_123').digest('hex');assert.equal(verifySignature('order_123','pay_123',sig,'secret'),true);assert.equal(verifySignature('order_123','pay_456',sig,'secret'),false);});
