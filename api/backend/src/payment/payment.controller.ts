import { Controller, Post, Body, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { validateSessionAndPermissions } from '../utils/authentication.helper';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-checkout-session')
  @UsePipes(new ValidationPipe())
  async createCheckoutSession(@Body() createCheckoutSessionDto: CreateCheckoutSessionDto, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    validateSessionAndPermissions(token, 'user');

    return this.paymentService.createCheckoutSession(createCheckoutSessionDto.amount, createCheckoutSessionDto.currency);
  }

  @Post('create-subscription')
  @UsePipes(new ValidationPipe())
  async createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    validateSessionAndPermissions(token, 'user');

    return this.paymentService.createSubscription(createSubscriptionDto.customerId, createSubscriptionDto.priceId);
  }

  @Post('cancel-subscription')
  @UsePipes(new ValidationPipe())
  async cancelSubscription(@Body() cancelSubscriptionDto: CancelSubscriptionDto, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    validateSessionAndPermissions(token, 'user');

    return this.paymentService.cancelSubscription(cancelSubscriptionDto.subscriptionId);
  }

  @Post('webhook')
  async handleWebhook(@Req() req: Request) {
    const sig = Array.isArray(req.headers['stripe-signature']) ? req.headers['stripe-signature'][0] : req.headers['stripe-signature'];

    let event;

    try {
      event = this.paymentService.constructWebhookEvent(
        req.body,
        sig
      );
    } catch (err) {
      throw new Error(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('PaymentIntent was successful!');
        break;
      case 'payment_method.attached':
        const paymentMethod = event.data.object;
        console.log('PaymentMethod was attached to a Customer!');
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }
}
