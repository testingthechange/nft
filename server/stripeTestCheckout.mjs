import Stripe from 'stripe';

// Stripe TEST mode only. No customer/browser-provided prices or discount claims.
// This is a server-side preparation module, not an active payment endpoint.
export function stripeTestClient(secret = process.env.STRIPE_TEST_SECRET_KEY) {
  if (!secret || !secret.startsWith('sk_test_')) return null;
  return new Stripe(secret);
}
export function testCheckoutQuote({ quantity = 1, demoDiscount = false } = {}) {
  const q = Number(quantity);
  if (!Number.isInteger(q) || q < 1 || q > 20) throw new Error('invalid_quantity');
  const subtotalCents = q * 999;
  const discountCents = demoDiscount ? Math.min(500, subtotalCents) : 0;
  return Object.freeze({
    currency: 'usd', unitAmountCents: 999, quantity: q,
    subtotalCents, discountCents, totalCents: subtotalCents - discountCents,
    mode: 'stripe_test_preparation', chargeAuthorized: false,
  });
}
export async function createStripeTestCheckout({ secret, quantity = 1, demoDiscount = false, successUrl, cancelUrl } = {}) {
  const stripe = stripeTestClient(secret);
  if (!stripe) throw new Error('stripe_test_key_not_configured');
  const quote = testCheckoutQuote({quantity,demoDiscount});
  for (const value of [successUrl,cancelUrl]) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'thirdparty-tz9x.onrender.com')
      throw new Error('invalid_checkout_return_url');
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price_data: {
      currency: 'usd', product_data: {name:'AJINE album — TEST PURCHASE'},
      unit_amount: quote.totalCents,
    }, quantity: 1 }],
    success_url: successUrl, cancel_url: cancelUrl,
    metadata: {environment:'test', mock_nft_discount: String(demoDiscount), quantity:String(quote.quantity)},
  });
  return {sessionId:session.id,url:session.url,quote};
}
