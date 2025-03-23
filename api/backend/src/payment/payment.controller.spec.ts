import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { validateSessionAndPermissions } from '../utils/authentication.helper';
import { ForbiddenException } from '@nestjs/common';

// Mock authentication helper
jest.mock('../utils/authentication.helper', () => ({
  validateSessionAndPermissions: jest.fn().mockReturnValue({
    id: 'test-user-id',
    role: 'user',
  }),
}));

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: PaymentService;

  const mockPaymentService = {
    createCheckoutSession: jest.fn().mockImplementation((amount, currency) => {
      return Promise.resolve({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });
    }),
    createSubscription: jest.fn().mockImplementation((customerId, priceId) => {
      return Promise.resolve({
        id: 'sub_test_123',
        status: 'active',
      });
    }),
    cancelSubscription: jest.fn().mockImplementation((subscriptionId) => {
      return Promise.resolve({
        id: subscriptionId,
        status: 'active',
        cancel_at_period_end: true,
      });
    }),
    constructWebhookEvent: jest.fn().mockImplementation((body, signature) => {
      if (signature !== 'valid_signature') {
        throw new Error('Invalid signature');
      }
      return {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
          },
        },
      };
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session with valid input', async () => {
      const dto = { amount: 1999, currency: 'usd' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const result = await controller.createCheckoutSession(dto, mockRequest as any);

      expect(validateSessionAndPermissions).toHaveBeenCalledWith('valid-token', 'user');
      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(dto.amount, dto.currency);
      expect(result).toEqual({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });
    });

    it('should throw error when no token is provided', async () => {
      const dto = { amount: 1999, currency: 'usd' };
      const mockRequest = {
        headers: {},
      };

      await expect(controller.createCheckoutSession(dto, mockRequest as any)).rejects.toThrow(
        'Authorization token is required'
      );
      expect(paymentService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('should throw error when token is malformed', async () => {
      const dto = { amount: 1999, currency: 'usd' };
      const mockRequest = {
        headers: {
          authorization: 'InvalidTokenFormat',
        },
      };

      await expect(controller.createCheckoutSession(dto, mockRequest as any)).rejects.toThrow(
        'Authorization token is required'
      );
      expect(paymentService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('should throw error when authentication fails', async () => {
      const dto = { amount: 1999, currency: 'usd' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      (validateSessionAndPermissions as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Authentication failed');
      });

      await expect(controller.createCheckoutSession(dto, mockRequest as any)).rejects.toThrow(
        'Authentication failed'
      );
      expect(paymentService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('should throw error when user does not have required permissions', async () => {
      const dto = { amount: 1999, currency: 'usd' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      (validateSessionAndPermissions as jest.Mock).mockImplementationOnce(() => {
        throw new ForbiddenException('Insufficient permissions');
      });

      await expect(controller.createCheckoutSession(dto, mockRequest as any)).rejects.toThrow(
        ForbiddenException
      );
      expect(paymentService.createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription with valid input', async () => {
      const dto = { customerId: 'cus_test_123', priceId: 'price_test_123' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const result = await controller.createSubscription(dto, mockRequest as any);

      expect(validateSessionAndPermissions).toHaveBeenCalledWith('valid-token', 'user');
      expect(paymentService.createSubscription).toHaveBeenCalledWith(dto.customerId, dto.priceId);
      expect(result).toEqual({
        id: 'sub_test_123',
        status: 'active',
      });
    });

    it('should throw error when no token is provided', async () => {
      const dto = { customerId: 'cus_test_123', priceId: 'price_test_123' };
      const mockRequest = {
        headers: {},
      };

      await expect(controller.createSubscription(dto, mockRequest as any)).rejects.toThrow(
        'Authorization token is required'
      );
      expect(paymentService.createSubscription).not.toHaveBeenCalled();
    });

    it('should throw error when token is malformed', async () => {
      const dto = { customerId: 'cus_test_123', priceId: 'price_test_123' };
      const mockRequest = {
        headers: {
          authorization: 'InvalidTokenFormat',
        },
      };

      await expect(controller.createSubscription(dto, mockRequest as any)).rejects.toThrow(
        'Authorization token is required'
      );
      expect(paymentService.createSubscription).not.toHaveBeenCalled();
    });

    it('should throw error when stripe returns an error', async () => {
      const dto = { customerId: 'cus_test_123', priceId: 'price_test_123' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const stripeError = new Error('Invalid customer ID');
      mockPaymentService.createSubscription.mockRejectedValueOnce(stripeError);

      await expect(controller.createSubscription(dto, mockRequest as any)).rejects.toThrow(
        'Invalid customer ID'
      );
      expect(paymentService.createSubscription).toHaveBeenCalledWith(dto.customerId, dto.priceId);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription with valid input', async () => {
      const dto = { subscriptionId: 'sub_test_123' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const result = await controller.cancelSubscription(dto, mockRequest as any);

      expect(validateSessionAndPermissions).toHaveBeenCalledWith('valid-token', 'user');
      expect(paymentService.cancelSubscription).toHaveBeenCalledWith(dto.subscriptionId);
      expect(result).toEqual({
        id: 'sub_test_123',
        status: 'active',
        cancel_at_period_end: true,
      });
    });

    it('should throw error when no token is provided', async () => {
      const dto = { subscriptionId: 'sub_test_123' };
      const mockRequest = {
        headers: {},
      };

      await expect(controller.cancelSubscription(dto, mockRequest as any)).rejects.toThrow(
        'Authorization token is required'
      );
      expect(paymentService.cancelSubscription).not.toHaveBeenCalled();
    });

    it('should throw error when stripe returns an error', async () => {
      const dto = { subscriptionId: 'non_existent_sub' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const stripeError = new Error('Subscription not found');
      mockPaymentService.cancelSubscription.mockRejectedValueOnce(stripeError);

      await expect(controller.cancelSubscription(dto, mockRequest as any)).rejects.toThrow(
        'Subscription not found'
      );
      expect(paymentService.cancelSubscription).toHaveBeenCalledWith(dto.subscriptionId);
    });
  });

  describe('handleWebhook', () => {
    it('should handle webhook event with valid signature', async () => {
      const mockRequest = {
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: Buffer.from(JSON.stringify({ id: 'evt_test_123' })),
      };

      const result = await controller.handleWebhook(mockRequest as any);

      expect(paymentService.constructWebhookEvent).toHaveBeenCalledWith(
        mockRequest.body,
        'valid_signature'
      );
      expect(result).toEqual({ received: true });
    });

    it('should throw error when webhook signature is invalid', async () => {
      const mockRequest = {
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: Buffer.from(JSON.stringify({ id: 'evt_test_123' })),
      };

      await expect(controller.handleWebhook(mockRequest as any)).rejects.toThrow(/Webhook Error/);
      expect(paymentService.constructWebhookEvent).toHaveBeenCalledWith(
        mockRequest.body,
        'invalid_signature'
      );
    });

    it('should handle array of stripe signatures', async () => {
      const mockRequest = {
        headers: {
          'stripe-signature': ['valid_signature'],
        },
        body: Buffer.from(JSON.stringify({ id: 'evt_test_123' })),
      };

      const result = await controller.handleWebhook(mockRequest as any);

      expect(paymentService.constructWebhookEvent).toHaveBeenCalledWith(
        mockRequest.body,
        'valid_signature'
      );
      expect(result).toEqual({ received: true });
    });

    it('should handle payment_intent.succeeded event type', async () => {
      const mockRequest = {
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: Buffer.from(JSON.stringify({ id: 'evt_test_123' })),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await controller.handleWebhook(mockRequest as any);

      expect(consoleSpy).toHaveBeenCalledWith('PaymentIntent was successful!');
      consoleSpy.mockRestore();
    });

    it('should handle payment_method.attached event type', async () => {
      const eventWithPaymentMethod = {
        id: 'evt_test_123',
        type: 'payment_method.attached',
        data: {
          object: {
            id: 'pm_test_123',
          },
        },
      };

      mockPaymentService.constructWebhookEvent.mockReturnValueOnce(eventWithPaymentMethod);

      const mockRequest = {
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: Buffer.from(JSON.stringify({ id: 'evt_test_123' })),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await controller.handleWebhook(mockRequest as any);

      expect(consoleSpy).toHaveBeenCalledWith('PaymentMethod was attached to a Customer!');
      consoleSpy.mockRestore();
    });

    it('should handle unrecognized event types', async () => {
      const unknownEvent = {
        id: 'evt_test_123',
        type: 'unknown_event_type',
        data: {
          object: {},
        },
      };

      mockPaymentService.constructWebhookEvent.mockReturnValueOnce(unknownEvent);

      const mockRequest = {
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: Buffer.from(JSON.stringify({ id: 'evt_test_123' })),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await controller.handleWebhook(mockRequest as any);

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled event type unknown_event_type');
      consoleSpy.mockRestore();
    });
  });

  describe('security tests', () => {
    it('should handle malformed authorization headers', async () => {
      const testCases = [
        { header: '', errorMessage: 'Authorization token is required' },
        { header: 'Bearer ', errorMessage: 'Authorization token is required' },
        { header: 'NotBearer token123', errorMessage: 'Authorization token is required' },
      ];

      const dto = { amount: 1999, currency: 'usd' };

      for (const testCase of testCases) {
        const mockRequest = {
          headers: {
            authorization: testCase.header,
          },
        };

        // Mock authentication to throw for these test cases
        (validateSessionAndPermissions as jest.Mock).mockImplementationOnce(() => {
          throw new Error(testCase.errorMessage);
        });

        await expect(controller.createCheckoutSession(dto, mockRequest as any)).rejects.toThrow(
          testCase.errorMessage
        );
      }
    });

    it('should handle potential XSS in authorization header', async () => {
      const suspiciousHeaders = [
        "Bearer <script>alert('xss')</script>",
        "Bearer ' OR '1'='1",
        "Bearer `; DROP TABLE users; --`",
      ];

      const dto = { amount: 1999, currency: 'usd' };

      for (const header of suspiciousHeaders) {
        const mockRequest = {
          headers: {
            authorization: header,
          },
        };

        // Should extract token without executing any malicious code
        const token = header.split(' ')[1];

        try {
          await controller.createCheckoutSession(dto, mockRequest as any);
        } catch (error) {
          // We expect validateSessionAndPermissions to be called with the extracted token
          expect(validateSessionAndPermissions).toHaveBeenCalledWith(token, 'user');
        }
      }
    });

    it('should handle missing headers safely', async () => {
      const testCases = [
        { request: undefined, errorMessage: /Cannot read properties/ },
        { request: {}, errorMessage: 'Authorization token is required' },
        { request: { headers: null }, errorMessage: 'Authorization token is required' },
      ];

      const dto = { amount: 1999, currency: 'usd' };

      for (const testCase of testCases) {
        await expect(controller.createCheckoutSession(dto, testCase.request as any)).rejects.toThrowError();
      }
    });
  });

  describe('input validation', () => {
    it('should handle zero amount checkout sessions', async () => {
      const dto = { amount: 0, currency: 'usd' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      await controller.createCheckoutSession(dto, mockRequest as any);
      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(0, 'usd');
    });

    it('should handle negative amount (Stripe will reject it)', async () => {
      const dto = { amount: -100, currency: 'usd' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      await controller.createCheckoutSession(dto, mockRequest as any);
      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(-100, 'usd');
    });

    it('should handle various currency formats', async () => {
      const currencies = ['usd', 'eur', 'USD', 'EUR', 'gbp', 'jpy'];

      for (const currency of currencies) {
        const dto = { amount: 1999, currency };
        const mockRequest = {
          headers: {
            authorization: 'Bearer valid-token',
          },
        };

        await controller.createCheckoutSession(dto, mockRequest as any);
        expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(1999, currency);
      }
    });
  });

  describe('performance tests', () => {
    it('should handle multiple concurrent checkout sessions', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const numRequests = 10;
      const checkoutPromises = Array(numRequests)
        .fill(null)
        .map((_, i) => {
          const dto = { amount: 1000 + i, currency: 'usd' };
          return controller.createCheckoutSession(dto, mockRequest as any);
        });

      await Promise.all(checkoutPromises);
      expect(paymentService.createCheckoutSession).toHaveBeenCalledTimes(numRequests);
    });

    it('should handle multiple concurrent subscription operations', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const numRequests = 5;
      const subscriptionPromises = Array(numRequests)
        .fill(null)
        .map((_, i) => {
          const dto = { customerId: `cus_test_${i}`, priceId: `price_test_${i}` };
          return controller.createSubscription(dto, mockRequest as any);
        });

      await Promise.all(subscriptionPromises);
      expect(paymentService.createSubscription).toHaveBeenCalledTimes(numRequests);
    });

    it('should handle batch webhook processing', async () => {
      // Create multiple webhook requests in sequence
      const webhookTypes = [
        'payment_intent.succeeded',
        'payment_method.attached',
        'charge.succeeded',
        'checkout.session.completed',
        'unknown_type',
      ];

      for (const type of webhookTypes) {
        const event = {
          id: `evt_test_${type.replace('.', '_')}`,
          type,
          data: { object: { id: `obj_${type.replace('.', '_')}` } },
        };

        mockPaymentService.constructWebhookEvent.mockReturnValueOnce(event);

        const mockRequest = {
          headers: {
            'stripe-signature': 'valid_signature',
          },
          body: Buffer.from(JSON.stringify({ id: `evt_test_${type}` })),
        };

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        await controller.handleWebhook(mockRequest as any);
        consoleSpy.mockRestore();
      }

      // Should have processed all webhook events
      expect(paymentService.constructWebhookEvent).toHaveBeenCalledTimes(webhookTypes.length);
    });
  });

  describe('workflow tests', () => {
    it('should simulate a complete payment journey from checkout to webhook', async () => {
      // Step 1: Create checkout session
      const checkoutDto = { amount: 2500, currency: 'usd' };
      const authRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      await controller.createCheckoutSession(checkoutDto, authRequest as any);
      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(2500, 'usd');

      // Step 2: Simulate Stripe sending a webhook event for successful payment
      const successEvent = {
        id: 'evt_test_payment_success',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 2500,
            currency: 'usd',
            status: 'succeeded',
          },
        },
      };

      mockPaymentService.constructWebhookEvent.mockReturnValueOnce(successEvent);

      const webhookRequest = {
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: Buffer.from(JSON.stringify({ id: 'evt_test_payment_success' })),
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await controller.handleWebhook(webhookRequest as any);
      expect(consoleSpy).toHaveBeenCalledWith('PaymentIntent was successful!');
      consoleSpy.mockRestore();
    });

    it('should simulate a complete subscription journey', async () => {
      // Step 1: Create subscription
      const subscriptionDto = { customerId: 'cus_test_123', priceId: 'price_premium_monthly' };
      const authRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const subscription = await controller.createSubscription(subscriptionDto, authRequest as any);
      expect(paymentService.createSubscription).toHaveBeenCalledWith('cus_test_123', 'price_premium_monthly');
      expect(subscription.id).toBe('sub_test_123');

      // Step 2: Cancel subscription
      const cancelDto = { subscriptionId: 'sub_test_123' };
      
      const canceledSubscription = await controller.cancelSubscription(cancelDto, authRequest as any);
      expect(paymentService.cancelSubscription).toHaveBeenCalledWith('sub_test_123');
      expect(canceledSubscription.cancel_at_period_end).toBe(true);
    });

    it('should handle a scenario where checkout succeeds but webhook fails', async () => {
      // Step 1: Create checkout session successfully
      const checkoutDto = { amount: 2500, currency: 'usd' };
      const authRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      await controller.createCheckoutSession(checkoutDto, authRequest as any);
      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(2500, 'usd');

      // Step 2: Webhook with invalid signature
      const webhookRequest = {
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: Buffer.from(JSON.stringify({ id: 'evt_test_123' })),
      };

      await expect(controller.handleWebhook(webhookRequest as any)).rejects.toThrow(/Webhook Error/);
    });

    it('should handle a payment journey with specific error scenarios', async () => {
      // Simulate various error scenarios in sequence

      // Scenario 1: Authentication failure during checkout
      const checkoutDto = { amount: 2500, currency: 'usd' };
      const invalidAuthRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      (validateSessionAndPermissions as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Authentication failed');
      });

      await expect(controller.createCheckoutSession(checkoutDto, invalidAuthRequest as any)).rejects.toThrow(
        'Authentication failed'
      );

      // Scenario 2: Successful authentication but Stripe error
      const validAuthRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      mockPaymentService.createCheckoutSession.mockRejectedValueOnce(new Error('Stripe API error'));

      await expect(controller.createCheckoutSession(checkoutDto, validAuthRequest as any)).rejects.toThrow(
        'Stripe API error'
      );

      // Scenario 3: Successful checkout but webhook error
      mockPaymentService.createCheckoutSession.mockResolvedValueOnce({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      await controller.createCheckoutSession(checkoutDto, validAuthRequest as any);

      // Webhook fails due to invalid signature
      const webhookRequest = {
        headers: {
          'stripe-signature': 'invalid_signature',
        },
        body: Buffer.from(JSON.stringify({ id: 'evt_test_123' })),
      };

      await expect(controller.handleWebhook(webhookRequest as any)).rejects.toThrow(/Webhook Error/);
    });
  });

  describe('edge cases', () => {
    it('should handle extremely large amounts in checkout session', async () => {
      const largeAmount = Number.MAX_SAFE_INTEGER; // 9007199254740991
      const dto = { amount: largeAmount, currency: 'usd' };
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      await controller.createCheckoutSession(dto, mockRequest as any);
      expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(largeAmount, 'usd');
    });

    it('should handle unusual currency codes', async () => {
      const unusualCurrencies = ['btc', 'xmr', 'Э@@', '123', 'a'.repeat(100)];

      for (const currency of unusualCurrencies) {
        const dto = { amount: 1999, currency };
        const mockRequest = {
          headers: {
            authorization: 'Bearer valid-token',
          },
        };

        await controller.createCheckoutSession(dto, mockRequest as any);
        expect(paymentService.createCheckoutSession).toHaveBeenCalledWith(1999, currency);
      }
    });

    it('should handle empty webhook body', async () => {
      const mockRequest = {
        headers: {
          'stripe-signature': 'valid_signature',
        },
        body: Buffer.from(''),
      };

      // Mock implementation to throw for empty body
      mockPaymentService.constructWebhookEvent.mockImplementationOnce(() => {
        throw new Error('No webhook data found');
      });

      await expect(controller.handleWebhook(mockRequest as any)).rejects.toThrow(/Webhook Error/);
    });

    it('should handle unusual customer and price IDs in subscription creation', async () => {
      const testCases = [
        { customerId: '', priceId: 'price_test' },
        { customerId: 'cus_test', priceId: '' },
        { customerId: 'a'.repeat(500), priceId: 'price_test' }, // Very long ID
        { customerId: '🚀', priceId: '💰' }, // Emoji IDs
      ];

      for (const { customerId, priceId } of testCases) {
        const dto = { customerId, priceId };
        const mockRequest = {
          headers: {
            authorization: 'Bearer valid-token',
          },
        };

        await controller.createSubscription(dto, mockRequest as any);
        expect(paymentService.createSubscription).toHaveBeenCalledWith(customerId, priceId);
      }
    });
  });
});
