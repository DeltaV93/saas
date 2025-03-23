import Stripe from 'stripe';
import { logError } from './logging.helper';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

export async function createCheckoutSession(customerId: string, priceId: string) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });
    return session;
  } catch (error) {
    logError('Failed to create checkout session', error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }
}

export async function handleStripeWebhook(event: any, handlers: Record<string, Function>) {
  const handler = handlers[event.type];
  if (handler) {
    try {
      handler(event.data);
    } catch (error) {
      logError('Error processing Stripe webhook event', error);
    }
  } else {
    logError('Unhandled Stripe webhook event type', event.type);
  }
}

export async function retrieveSubscriptionStatus(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.status;
  } catch (error) {
    logError('Failed to retrieve subscription status', error);
    throw new Error(`Failed to retrieve subscription status: ${error.message}`);
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return canceledSubscription;
  } catch (error) {
    logError('Failed to cancel subscription', error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}

export async function manageSubscriptionUpgradeDowngrade(subscriptionId: string, newPriceId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: subscription.items.data[0].id, price: newPriceId }],
    });
    return updatedSubscription;
  } catch (error) {
    logError('Failed to manage subscription upgrade/downgrade', error);
    throw new Error(`Failed to manage subscription upgrade/downgrade: ${error.message}`);
  }
} 