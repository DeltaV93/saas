import { logError } from './logging.helper';
import crypto from 'crypto';

export function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const digest = hmac.digest('hex');
  return signature === digest;
}

export function processWebhookEvent(event: any, handlers: Record<string, Function>) {
  const handler = handlers[event.type];
  if (handler) {
    try {
      handler(event.data);
    } catch (error) {
      logError('Error processing webhook event', error);
    }
  } else {
    logError('Unhandled webhook event type', event.type);
  }
} 