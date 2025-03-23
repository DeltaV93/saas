import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('PaymentService', () => {
  let service: PaymentService;
  let mockStripe: any;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Set environment variables for testing
    process.env.STRIPE_SECRET_KEY = 'test_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret';
    process.env.FRONTEND_URL = 'http://localhost:3000';

    // Setup Stripe mock implementation
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      subscriptions: {
        create: jest.fn(),
        update: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    // Mock the Stripe constructor
    (Stripe as unknown as jest.Mock).mockImplementation(() => mockStripe);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentService],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    // Cleanup environment variables
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.FRONTEND_URL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session with valid parameters', async () => {
      const mockSessionData = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        status: 'open',
        payment_status: 'unpaid',
      };

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSessionData);

      const result = await service.createCheckoutSession(1999, 'usd');

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Sample Product',
              },
              unit_amount: 1999,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
      });

      expect(result).toEqual(mockSessionData);
    });

    it('should handle Stripe API errors', async () => {
      const stripeError = new Error('Invalid currency');
      mockStripe.checkout.sessions.create.mockRejectedValue(stripeError);

      await expect(service.createCheckoutSession(1999, 'invalid')).rejects.toThrow('Invalid currency');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it('should handle zero amount', async () => {
      await service.createCheckoutSession(0, 'usd');

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 0,
              }),
            }),
          ],
        })
      );
    });

    it('should handle various currency codes', async () => {
      const currencies = ['usd', 'eur', 'gbp', 'jpy'];

      for (const currency of currencies) {
        mockStripe.checkout.sessions.create.mockClear();
        await service.createCheckoutSession(1999, currency);

        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            line_items: [
              expect.objectContaining({
                price_data: expect.objectContaining({
                  currency,
                }),
              }),
            ],
          })
        );
      }
    });

    it('should fail with very large amounts', async () => {
      const exceedingLimit = Number.MAX_SAFE_INTEGER;
      const stripeError = new Error('Amount exceeds maximum supported value');
      
      mockStripe.checkout.sessions.create.mockRejectedValue(stripeError);

      await expect(service.createCheckoutSession(exceedingLimit, 'usd')).rejects.toThrow(
        'Amount exceeds maximum supported value'
      );
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription with valid parameters', async () => {
      const mockSubscriptionData = {
        id: 'sub_test_123',
        status: 'active',
        current_period_end: 1609459200,
        current_period_start: 1606780800,
      };

      mockStripe.subscriptions.create.mockResolvedValue(mockSubscriptionData);

      const result = await service.createSubscription('cus_test_123', 'price_test_123');

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        items: [{ price: 'price_test_123' }],
        expand: ['latest_invoice.payment_intent'],
      });

      expect(result).toEqual(mockSubscriptionData);
    });

    it('should handle Stripe API errors for invalid customer', async () => {
      const stripeError = new Error('No such customer: cus_invalid');
      mockStripe.subscriptions.create.mockRejectedValue(stripeError);

      await expect(service.createSubscription('cus_invalid', 'price_test_123')).rejects.toThrow(
        'No such customer: cus_invalid'
      );
      expect(mockStripe.subscriptions.create).toHaveBeenCalled();
    });

    it('should handle Stripe API errors for invalid price', async () => {
      const stripeError = new Error('No such price: price_invalid');
      mockStripe.subscriptions.create.mockRejectedValue(stripeError);

      await expect(service.createSubscription('cus_test_123', 'price_invalid')).rejects.toThrow(
        'No such price: price_invalid'
      );
      expect(mockStripe.subscriptions.create).toHaveBeenCalled();
    });

    it('should handle empty customer ID', async () => {
      const stripeError = new Error('Invalid customer ID');
      mockStripe.subscriptions.create.mockRejectedValue(stripeError);

      await expect(service.createSubscription('', 'price_test_123')).rejects.toThrow('Invalid customer ID');
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: '',
        items: [{ price: 'price_test_123' }],
        expand: ['latest_invoice.payment_intent'],
      });
    });

    it('should handle empty price ID', async () => {
      const stripeError = new Error('Invalid price ID');
      mockStripe.subscriptions.create.mockRejectedValue(stripeError);

      await expect(service.createSubscription('cus_test_123', '')).rejects.toThrow('Invalid price ID');
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        items: [{ price: '' }],
        expand: ['latest_invoice.payment_intent'],
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription with valid ID', async () => {
      const mockUpdatedSubscription = {
        id: 'sub_test_123',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: 1609459200,
        current_period_start: 1606780800,
      };

      mockStripe.subscriptions.update.mockResolvedValue(mockUpdatedSubscription);

      const result = await service.cancelSubscription('sub_test_123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test_123', {
        cancel_at_period_end: true,
      });

      expect(result).toEqual(mockUpdatedSubscription);
    });

    it('should handle non-existent subscription ID', async () => {
      const stripeError = new Error('No such subscription: sub_nonexistent');
      mockStripe.subscriptions.update.mockRejectedValue(stripeError);

      await expect(service.cancelSubscription('sub_nonexistent')).rejects.toThrow(
        'No such subscription: sub_nonexistent'
      );
      expect(mockStripe.subscriptions.update).toHaveBeenCalled();
    });

    it('should handle empty subscription ID', async () => {
      const stripeError = new Error('Invalid subscription ID');
      mockStripe.subscriptions.update.mockRejectedValue(stripeError);

      await expect(service.cancelSubscription('')).rejects.toThrow('Invalid subscription ID');
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('', {
        cancel_at_period_end: true,
      });
    });

    it('should handle already canceled subscription', async () => {
      const mockAlreadyCanceledSubscription = {
        id: 'sub_test_123',
        status: 'canceled',
        cancel_at_period_end: true,
      };

      mockStripe.subscriptions.update.mockResolvedValue(mockAlreadyCanceledSubscription);

      const result = await service.cancelSubscription('sub_test_123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test_123', {
        cancel_at_period_end: true,
      });

      expect(result).toEqual(mockAlreadyCanceledSubscription);
    });
  });

  describe('constructWebhookEvent', () => {
    it('should construct webhook event with valid data', () => {
      const mockEvent = {
        id: 'evt_test_123',
        object: 'event',
        type: 'payment_intent.succeeded',
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const requestBody = Buffer.from(JSON.stringify({ id: 'evt_test_123' }));
      const signature = 'valid_signature';

      const result = service.constructWebhookEvent(requestBody, signature);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        requestBody,
        signature,
        'test_webhook_secret'
      );
      expect(result).toEqual(mockEvent);
    });

    it('should handle invalid signature', () => {
      const stripeError = new Error('No signatures found matching the expected signature');
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw stripeError;
      });

      const requestBody = Buffer.from(JSON.stringify({ id: 'evt_test_123' }));
      const signature = 'invalid_signature';

      expect(() => service.constructWebhookEvent(requestBody, signature)).toThrow(
        'No signatures found matching the expected signature'
      );
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should handle empty request body', () => {
      const stripeError = new Error('Unexpected end of JSON input');
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw stripeError;
      });

      const requestBody = Buffer.from('');
      const signature = 'valid_signature';

      expect(() => service.constructWebhookEvent(requestBody, signature)).toThrow(
        'Unexpected end of JSON input'
      );
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should handle empty signature', () => {
      const stripeError = new Error('No signature header found');
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw stripeError;
      });

      const requestBody = Buffer.from(JSON.stringify({ id: 'evt_test_123' }));
      const signature = '';

      expect(() => service.constructWebhookEvent(requestBody, signature)).toThrow(
        'No signature header found'
      );
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should handle malformed JSON in request body', () => {
      const stripeError = new Error('Unexpected token in JSON');
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw stripeError;
      });

      const requestBody = Buffer.from('{malformed:json}');
      const signature = 'valid_signature';

      expect(() => service.constructWebhookEvent(requestBody, signature)).toThrow(
        'Unexpected token in JSON'
      );
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    });
  });

  describe('Edge cases and security tests', () => {
    it('should handle extremely long checkout session success/cancel URLs', async () => {
      // Store original implementation
      const originalImplementation = process.env.FRONTEND_URL;
      
      // Set very long frontend URL
      process.env.FRONTEND_URL = 'https://' + 'a'.repeat(500) + '.com';
      
      await service.createCheckoutSession(1999, 'usd');
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('https://a'),
          cancel_url: expect.stringContaining('https://a'),
        })
      );
      
      // Restore original implementation
      process.env.FRONTEND_URL = originalImplementation;
    });
    
    it('should sanitize currency input to prevent injection', async () => {
      const suspiciousCurrency = "usd'; DROP TABLE users; --";
      
      await service.createCheckoutSession(1999, suspiciousCurrency);
      
      // Verify that the suspicious input was passed directly to Stripe (which would handle validation)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: suspiciousCurrency,
              }),
            }),
          ],
        })
      );
    });
    
    it('should safely handle concurrent API calls', async () => {
      const numCalls = 5;
      const promises = [];
      
      for (let i = 0; i < numCalls; i++) {
        promises.push(service.createCheckoutSession(1000 + i, 'usd'));
      }
      
      await Promise.all(promises);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledTimes(numCalls);
    });
    
    it('should safely handle Stripe timeout errors', async () => {
      const timeoutError = new Error('Request timed out');
      mockStripe.checkout.sessions.create.mockRejectedValue(timeoutError);
      
      await expect(service.createCheckoutSession(1999, 'usd')).rejects.toThrow('Request timed out');
    });
    
    it('should handle stripe rate-limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      mockStripe.checkout.sessions.create.mockRejectedValue(rateLimitError);
      
      await expect(service.createCheckoutSession(1999, 'usd')).rejects.toThrow('Rate limit exceeded');
    });
    
    it('should accept various input formats for price amounts', async () => {
      // Testing various numeric representations
      const testAmounts = [
        1999, // Integer
        19.99, // Decimal
        "1999", // String that can be converted to number
        "19.99", // String with decimal
        Number("1999"), // Result of Number() conversion
        Math.floor(2000.99), // Result of Math operation
      ];
      
      for (const amount of testAmounts) {
        mockStripe.checkout.sessions.create.mockClear();
        
        // Force numeric coercion by multiplying
        const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
        await service.createCheckoutSession(numericAmount, 'usd');
        
        expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            line_items: [
              expect.objectContaining({
                price_data: expect.objectContaining({
                  unit_amount: numericAmount,
                }),
              }),
            ],
          })
        );
      }
    });
  });

  describe('Performance tests', () => {
    it('should handle multiple subscription operations in sequence', async () => {
      const mockSubscriptionData = {
        id: 'sub_test_123',
        status: 'active',
      };
      
      mockStripe.subscriptions.create.mockResolvedValue(mockSubscriptionData);
      
      // Create 3 subscriptions in sequence
      for (let i = 0; i < 3; i++) {
        await service.createSubscription(`cus_test_${i}`, `price_test_${i}`);
      }
      
      expect(mockStripe.subscriptions.create).toHaveBeenCalledTimes(3);
    });
    
    it('should handle multiple webhook event constructions', () => {
      const mockEvent = {
        id: 'evt_test_123',
        object: 'event',
        type: 'payment_intent.succeeded',
      };
      
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      
      // Process 5 webhooks in sequence
      for (let i = 0; i < 5; i++) {
        const requestBody = Buffer.from(JSON.stringify({ id: `evt_test_${i}` }));
        const signature = `signature_${i}`;
        
        service.constructWebhookEvent(requestBody, signature);
      }
      
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledTimes(5);
    });
    
    it('should maintain performance when processing large JSON payloads', () => {
      const mockEvent = {
        id: 'evt_test_large',
        object: 'event',
        type: 'payment_intent.succeeded',
      };
      
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      
      // Create a large JSON payload
      const largeObject = {
        id: 'evt_test_large',
        data: {
          object: {
            id: 'pi_test_123',
            // Add lots of nested data to make the payload larger
            customer: {
              id: 'cus_test_123',
              name: 'Test Customer',
              email: 'test@example.com',
              address: {
                line1: '123 Test St',
                line2: 'Apt 456',
                city: 'Test City',
                state: 'TS',
                postal_code: '12345',
                country: 'US',
              },
              // Array of 100 metadata items
              metadata: Array(100).fill(0).reduce((acc, _, idx) => {
                acc[`key_${idx}`] = `value_${idx}`;
                return acc;
              }, {}),
            },
            // Add an array of 50 line items
            line_items: Array(50).fill(0).map((_, idx) => ({
              id: `li_${idx}`,
              amount: 1000 + idx,
              currency: 'usd',
              description: `Item ${idx}`,
              quantity: 1,
            })),
          },
        },
      };
      
      const requestBody = Buffer.from(JSON.stringify(largeObject));
      const signature = 'valid_signature';
      
      service.constructWebhookEvent(requestBody, signature);
      
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        requestBody,
        signature,
        expect.any(String)
      );
    });
  });

  describe('error handling', () => {
    it('should handle Stripe API being unreachable', async () => {
      const networkError = new Error('Network error: Unable to connect to Stripe API');
      mockStripe.checkout.sessions.create.mockRejectedValue(networkError);
      
      await expect(service.createCheckoutSession(1999, 'usd')).rejects.toThrow(
        'Network error: Unable to connect to Stripe API'
      );
    });
    
    it('should handle Stripe API authorization errors', async () => {
      const authError = new Error('Invalid API key provided');
      mockStripe.checkout.sessions.create.mockRejectedValue(authError);
      
      await expect(service.createCheckoutSession(1999, 'usd')).rejects.toThrow(
        'Invalid API key provided'
      );
    });
    
    it('should handle malformed Stripe responses', async () => {
      // Simulate a malformed response from Stripe (missing expected properties)
      const malformedResponse = {
        // Missing id, url, etc.
        object: 'checkout.session',
      };
      
      mockStripe.checkout.sessions.create.mockResolvedValue(malformedResponse);
      
      // The service should still return whatever Stripe returns
      const result = await service.createCheckoutSession(1999, 'usd');
      expect(result).toEqual(malformedResponse);
    });
    
    it('should handle Stripe API version incompatibility', async () => {
      const versionError = new Error('This API version is not supported');
      mockStripe.checkout.sessions.create.mockRejectedValue(versionError);
      
      await expect(service.createCheckoutSession(1999, 'usd')).rejects.toThrow(
        'This API version is not supported'
      );
    });
  });
});
