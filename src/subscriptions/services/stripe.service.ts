// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import Stripe from 'stripe';

// @Injectable()
// export class StripeService {
//   private readonly logger = new Logger(StripeService.name);
//   private stripe: Stripe;

//   constructor(private configService: ConfigService) {
//     this.stripe = new Stripe(configService.get<string>('STRIPE_SECRET_KEY'), {
//       apiVersion: '2023-10-16',
//     });
//   }

//   async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
//     try {
//       const customer = await this.stripe.customers.create({
//         email,
//         name,
//       });
      
//       this.logger.log(`Created Stripe customer: ${customer.id}`);
//       return customer;
//     } catch (error) {
//       this.logger.error('Failed to create Stripe customer', error);
//       throw error;
//     }
//   }

//   async createSubscription(
//     customerId: string,
//     priceId: string,
//     metadata?: Record<string, string>
//   ): Promise<Stripe.Subscription> {
//     try {
//       const subscription = await this.stripe.subscriptions.create({
//         customer: customerId,
//         items: [{ price: priceId }],
//         payment_behavior: 'default_incomplete',
//         payment_settings: {
//           save_default_payment_method: 'on_subscription',
//         },
//         expand: ['latest_invoice.payment_intent'],
//         metadata,
//       });

//       this.logger.log(`Created subscription: ${subscription.id}`);
//       return subscription;
//     } catch (error) {
//       this.logger.error('Failed to create subscription', error);
//       throw error;
//     }
//   }

//   async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
//     try {
//       const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
//       this.logger.log(`Canceled subscription: ${subscriptionId}`);
//       return subscription;
//     } catch (error) {
//       this.logger.error('Failed to cancel subscription', error);
//       throw error;
//     }
//   }

//   async createPaymentIntent(
//     amount: number,
//     currency: string = 'usd',
//     customerId?: string
//   ): Promise<Stripe.PaymentIntent> {
//     try {
//       const paymentIntent = await this.stripe.paymentIntents.create({
//         amount: amount * 100, // Convert to cents
//         currency,
//         customer: customerId,
//         automatic_payment_methods: {
//           enabled: true,
//         },
//       });

//       return paymentIntent;
//     } catch (error) {
//       this.logger.error('Failed to create payment intent', error);
//       throw error;
//     }
//   }

//   async handleWebhook(signature: string, payload: Buffer) {
//     const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
//     try {
//       const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
//       this.logger.log(`Received Stripe webhook: ${event.type}`);
//       return event;
//     } catch (error) {
//       this.logger.error('Webhook signature verification failed', error);
//       throw error;
//     }
//   }
// }
