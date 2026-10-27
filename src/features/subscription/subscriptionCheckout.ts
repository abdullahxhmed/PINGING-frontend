import { subscriptionApi } from '../../lib/api';
import { loadRazorpayScript } from '../../utils/loadRazorpay';
import type { SubscriptionPack, PaymentSuccessDetails } from '../../types/subscription';

export interface InitiateSubscriptionCheckoutParams {
  pack: SubscriptionPack;
  user?: {
    name?: string;
    phone?: string;
    email?: string;
  } | null;
  onSuccess: (details: PaymentSuccessDetails) => void;
  onError: (errorMsg: string) => void;
  onProcessingChange: (isProcessing: boolean) => void;
}

/**
 * Initiates the complete Razorpay subscription checkout pipeline:
 * 1. Loads Razorpay SDK
 * 2. POST /api/subscriptions/purchase (creates Razorpay order & returns order_id, keyId, etc.)
 * 3. Launches Razorpay Checkout modal
 * 4. On payment callback, calls POST /api/subscriptions/verify-payment for cryptographic verification
 * 5. Dispatches subscription updates & triggers onSuccess to show the animated clean tick modal
 */
export async function initiateSubscriptionCheckout({
  pack,
  user,
  onSuccess,
  onError,
  onProcessingChange,
}: InitiateSubscriptionCheckoutParams): Promise<void> {
  onProcessingChange(true);

  try {
    // 1. Ensure Razorpay Checkout SDK is ready
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      throw new Error('Failed to load secure Razorpay payment gateway. Please check your network connection.');
    }

    // 2. Create Payment Order on backend
    const orderData = await subscriptionApi.createPurchase({
      packType: pack.packType,
      paymentProvider: 'RAZORPAY',
      metadata: {
        channel: 'web_client_subscription',
      },
    });

    if (!orderData || !orderData.razorpayOrderId) {
      throw new Error('Could not initiate payment order with gateway. Please try again.');
    }

    const {
      keyId,
      amount,
      currency,
      razorpayOrderId,
      pack: returnedPack,
      prefill,
    } = orderData;

    // 3. Launch Razorpay Checkout Modal
    const options = {
      key: keyId,
      amount: amount || pack.amountPaise,
      currency: currency || 'INR',
      name: 'kauntact.in',
      description: returnedPack?.name || pack.name,
      order_id: razorpayOrderId,
      prefill: {
        name: prefill?.name || user?.name || '',
        contact: prefill?.contact || user?.phone || '',
      },
      theme: { color: '#10b981' },
      handler: async function (response: any) {
        try {
          onProcessingChange(true);

          // 4. Cryptographic Signature Verification & Instant Activation
          const verifyData = await subscriptionApi.verifyPayment({
            razorpayOrderId: response.razorpay_order_id || razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          // Dispatch sync events across application
          window.dispatchEvent(new CustomEvent('subscription:updated'));
          window.dispatchEvent(new CustomEvent('resource:updated'));
          window.dispatchEvent(new CustomEvent('tag:updated'));

          // 5. Trigger success with details stating plan and duration
          onSuccess({
            planName: returnedPack?.name || pack.name,
            durationMonths: returnedPack?.plusDurationMonths || pack.plusDurationMonths || 12,
            tier: verifyData?.subscription?.tier || 'PLUS',
            amountPaise: amount || pack.amountPaise,
            expiresAt: verifyData?.subscription?.expiresAt,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id || razorpayOrderId,
          });
        } catch (verifyErr: any) {
          onError(verifyErr.message || 'Payment signature verification failed. Please contact support.');
        } finally {
          onProcessingChange(false);
        }
      },
      modal: {
        ondismiss: function () {
          onProcessingChange(false);
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (resp: any) {
      onProcessingChange(false);
      onError(resp?.error?.description || 'Payment was unsuccessful or cancelled.');
    });
    rzp.open();
  } catch (err: any) {
    onProcessingChange(false);
    onError(err.message || 'Payment initiation failed.');
  }
}
