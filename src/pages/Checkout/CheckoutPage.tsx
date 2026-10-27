import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { StoreHeader, StoreFooter } from '../../components/store';
import {
  type StoreCartState,
  calculateCart,
  getCartFromStorage,
  saveCartToStorage,
  saveOrderToStorage,
  INDIAN_STATES,
  type OrderRecord,
  type ShippingAddress,
  MAX_ITEMS_PER_ORDER,
} from '../../features/store/catalog';
import {
  ShieldCheck,
  Truck,
  ArrowLeft,
  AlertCircle,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import { startCheckoutFlow, getOrderStatus, pollOrderStatus } from '../../services/checkout';
import { useStoreCatalog } from '../../features/store/useStoreCatalog';

const CHECKOUT_DRAFT_KEY = 'kauntact_checkout_draft';
const ACTIVE_PAYMENT_KEY = 'kauntact_active_payment';

interface CheckoutDraft {
  fullName: string;
  mobileNumber: string;
  email: string;
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  termsAgreed: boolean;
}

const getStoredDraft = (): Partial<CheckoutDraft> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY) || localStorage.getItem(CHECKOUT_DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const getInitialActivePayment = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ACTIVE_PAYMENT_KEY) || localStorage.getItem(ACTIVE_PAYMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.orderNumber && Date.now() - (parsed.timestamp || 0) < 30 * 60 * 1000) {
      return parsed.orderNumber;
    }
    sessionStorage.removeItem(ACTIVE_PAYMENT_KEY);
    localStorage.removeItem(ACTIVE_PAYMENT_KEY);
  } catch {}
  return null;
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromOrigin = (location.state as { from?: string } | null)?.from;

  // Real-time backend catalog
  const { sets, addons, products: backendCatalog } = useStoreCatalog();

  // Load cart from storage
  const [cart, setCart] = useState<StoreCartState>(() => getCartFromStorage());

  // Form Fields - Auto-restored from storage so tab switches / refreshes never wipe customer input
  const draft = getStoredDraft();
  const [fullName, setFullName] = useState(draft.fullName || '');
  const [mobileNumber, setMobileNumber] = useState(draft.mobileNumber || '');
  const [email, setEmail] = useState(draft.email || '');
  const [addressLine, setAddressLine] = useState(draft.addressLine || '');
  const [locality, setLocality] = useState(draft.locality || '');
  const [city, setCity] = useState(draft.city || '');
  const [state, setState] = useState(draft.state || 'Maharashtra');
  const [pincode, setPincode] = useState(draft.pincode || '');
  const [termsAgreed, setTermsAgreed] = useState(draft.termsAgreed ?? false);

  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  // In-flight payment recovery state (if user left app for UPI and returned)
  const [activePaymentOrder, setActivePaymentOrder] = useState<string | null>(getInitialActivePayment);
  const [isVerifyingActivePayment, setIsVerifyingActivePayment] = useState<boolean>(() => activePaymentOrder !== null);

  // Auto-persist form fields on change so details are NEVER lost on app switch or refresh
  useEffect(() => {
    const data: CheckoutDraft = {
      fullName,
      mobileNumber,
      email,
      addressLine,
      locality,
      city,
      state,
      pincode,
      termsAgreed,
    };
    try {
      const serialized = JSON.stringify(data);
      sessionStorage.setItem(CHECKOUT_DRAFT_KEY, serialized);
      localStorage.setItem(CHECKOUT_DRAFT_KEY, serialized);
    } catch {}
  }, [fullName, mobileNumber, email, addressLine, locality, city, state, pincode, termsAgreed]);

  // When returning to checkout or reloading right after payment, verify and auto-resume
  useEffect(() => {
    if (!activePaymentOrder) return;

    let isCancelled = false;
    setIsVerifyingActivePayment(true);

    pollOrderStatus(
      activePaymentOrder,
      (confirmedOrder) => {
        if (isCancelled) return;
        sessionStorage.removeItem(ACTIVE_PAYMENT_KEY);
        localStorage.removeItem(ACTIVE_PAYMENT_KEY);
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        localStorage.removeItem(CHECKOUT_DRAFT_KEY);
        saveCartToStorage({ sets: {}, addons: {}, setTones: {} });
        navigate(`/order/${confirmedOrder}`, { state: { from: 'bottom' } });
      },
      () => {
        if (!isCancelled) {
          setIsVerifyingActivePayment(false);
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [activePaymentOrder, navigate]);

  // Validation & Error Handling
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cartCalc = calculateCart(cart, sets, addons);

  const updateSetQty = (id: string, delta: number) => {
    if (delta > 0 && cartCalc.itemCount >= MAX_ITEMS_PER_ORDER) {
      return;
    }
    setCart((prev) => {
      const current = prev.sets[id] || 0;
      const next = Math.max(0, Math.min(MAX_ITEMS_PER_ORDER, current + delta));
      const updatedSets = { ...prev.sets };
      if (next === 0) {
        delete updatedSets[id];
      } else {
        updatedSets[id] = next;
      }
      const updated = { ...prev, sets: updatedSets };
      saveCartToStorage(updated);
      return updated;
    });
  };

  const updateAddonQty = (id: string, delta: number) => {
    if (delta > 0 && cartCalc.itemCount >= MAX_ITEMS_PER_ORDER) {
      return;
    }
    setCart((prev) => {
      const current = prev.addons[id] || 0;
      const next = Math.max(0, Math.min(MAX_ITEMS_PER_ORDER, current + delta));
      const updatedAddons = { ...prev.addons };
      if (next === 0) {
        delete updatedAddons[id];
      } else {
        updatedAddons[id] = next;
      }
      const updated = { ...prev, addons: updatedAddons };
      saveCartToStorage(updated);
      return updated;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (cartCalc.itemCount === 0) {
      errs.cart = 'Your cart is empty. Please add items from the store.';
    } else if (cartCalc.itemCount > MAX_ITEMS_PER_ORDER) {
      errs.cart = `Maximum of ${MAX_ITEMS_PER_ORDER} items allowed per order. Please adjust your cart.`;
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = 'Please enter your full recipient name.';
    }

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      errs.mobileNumber = 'Please enter a valid 10-digit Indian mobile number.';
    }

    if (!addressLine.trim() || addressLine.trim().length < 5) {
      errs.addressLine = 'Please enter a street, flat, or building address.';
    }

    if (!city.trim() || city.trim().length < 2) {
      errs.city = 'Please enter your city / town.';
    }

    if (!state.trim()) {
      errs.state = 'Please select a state.';
    }

    const cleanPin = pincode.replace(/\D/g, '');
    if (!cleanPin || cleanPin.length !== 6) {
      errs.pincode = 'Please enter a valid 6-digit postal PIN code.';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!termsAgreed) {
      errs.terms = 'Please accept the terms of service and order fulfillment agreement.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setProgressStatus('Initiating stock reservation...');

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    const cleanPin = pincode.replace(/\D/g, '');

    // Resolve exact checkout items from cart with accurate variant and product IDs
    const checkoutItems = cartCalc.items
      .filter((it) => it.quantity > 0 && it.variantId)
      .map((it) => ({
        variantId: it.variantId!,
        quantity: it.quantity,
        productId: it.productId,
      }));

    if (checkoutItems.length === 0) {
      setIsSubmitting(false);
      setProgressStatus(null);
      setErrors({
        submit: 'Unable to resolve the product variant ID for items in your cart. Please try re-adding items from the store.',
      });
      return;
    }

    const customer: ShippingAddress = {
      fullName: fullName.trim(),
      mobileNumber: cleanMobile,
      addressLine: addressLine.trim(),
      locality: locality.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: cleanPin,
    };

    // Pre-check stock across all cart variants
    for (const item of checkoutItems) {
      const matchedVariant = backendCatalog
        .flatMap((p) => p.variants || [])
        .find((v) => v.id === item.variantId);

      if (matchedVariant) {
        if (
          matchedVariant.inStock === false ||
          (matchedVariant.availableQuantity !== undefined && matchedVariant.availableQuantity <= 0)
        ) {
          setIsSubmitting(false);
          setErrors({ submit: `Sorry, ${matchedVariant.name || 'an item in your cart'} is currently sold out.` });
          return;
        }
        if (
          matchedVariant.availableQuantity !== undefined &&
          item.quantity > matchedVariant.availableQuantity
        ) {
          setIsSubmitting(false);
          setErrors({
            submit: `Only ${matchedVariant.availableQuantity} units available for ${matchedVariant.name}. Please adjust your cart quantity.`,
          });
          return;
        }
      }
    }

    await startCheckoutFlow(
      {
        items: checkoutItems,
        variantId: checkoutItems[0].variantId,
        quantity: checkoutItems[0].quantity,
        customerEmail: email.trim() || undefined,
        customerPhone: cleanMobile,
        shippingAddress: {
          fullName: fullName.trim(),
          phoneNumber: cleanMobile,
          addressLine1: addressLine.trim(),
          addressLine2: locality.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          postalCode: cleanPin,
          country: 'IN',
        },
      },
      (orderNumber) => {
        // Record completed order in storage for immediate offline/guest availability
        const confirmedOrder: OrderRecord = {
          orderId: orderNumber,
          items: cartCalc.items,
          itemCount: cartCalc.itemCount,
          totalTags: cartCalc.totalTags,
          subtotal: cartCalc.subtotal,
          shippingFee: cartCalc.shippingFee,
          total: cartCalc.total,
          customer,
          status: 'CONFIRMED',
          paymentGatewayStatus: 'PAID',
          createdAt: new Date().toISOString(),
        };

        saveOrderToStorage(confirmedOrder);
        sessionStorage.setItem('pending_claim_order', orderNumber);
        saveCartToStorage({ sets: {}, addons: {}, setTones: {} });
        try {
          sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
          localStorage.removeItem(CHECKOUT_DRAFT_KEY);
          sessionStorage.removeItem(ACTIVE_PAYMENT_KEY);
          localStorage.removeItem(ACTIVE_PAYMENT_KEY);
        } catch {}
        setIsSubmitting(false);
        navigate(`/order/${orderNumber}`, { state: { from: 'bottom' } });
      },
      (errorMsg) => {
        setIsSubmitting(false);
        setProgressStatus(null);
        setErrors({ submit: errorMsg });
      },
      (progressMsg) => {
        setProgressStatus(progressMsg);
      }
    );
  };

  // Component-relative emergence animation physics
  const initialMotion =
    fromOrigin === 'bottom'
      ? { opacity: 0, y: 80, scale: 0.94 }
      : fromOrigin === 'navbar'
      ? { opacity: 0, x: 60, scale: 0.96 }
      : { opacity: 0, y: 15 };

  const animateMotion = {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
  };

  const transitionMotion =
    fromOrigin === 'bottom'
      ? { type: 'spring' as const, damping: 26, stiffness: 260, mass: 0.85 }
      : fromOrigin === 'navbar'
      ? { type: 'spring' as const, damping: 26, stiffness: 280, mass: 0.85 }
      : { duration: 0.25, ease: 'easeOut' as const };

  const transformOriginStyle =
    fromOrigin === 'bottom'
      ? { transformOrigin: '50% 100%' }
      : fromOrigin === 'navbar'
      ? { transformOrigin: '90% 0%' }
      : { transformOrigin: 'top center' };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-ink flex flex-col">
      <StoreHeader cartCount={cartCalc.itemCount} />

      <motion.main
        initial={initialMotion}
        animate={animateMotion}
        transition={transitionMotion}
        style={transformOriginStyle}
        className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10"
      >
        {/* Navigation Breadcrumb */}
        <div className="mb-4">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted hover:text-ink font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to store
          </Link>
        </div>

        <div className="mb-6">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            CHECKOUT
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink uppercase">
            Delivery destination
          </h1>
          <p className="text-[14px] text-muted mt-1">
            Express courier across India within 3–5 business days. No login required.
          </p>
        </div>

        {errors.cart && (
          <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs font-medium">
            {errors.cart}
          </div>
        )}

        {/* In-Flight Payment Recovery Banner */}
        {activePaymentOrder && (
          <div className="mb-6 p-4 rounded-lg bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <Loader2 className={`w-4 h-4 text-ink shrink-0 ${isVerifyingActivePayment ? 'animate-spin' : ''}`} />
              <div>
                <p className="font-semibold text-ink">
                  {isVerifyingActivePayment ? 'Verifying payment with banking network...' : `Payment in progress for Order ${activePaymentOrder}`}
                </p>
                <p className="text-muted mt-0.5">
                  If you approved payment in your UPI or banking app, click below to verify. Your details are saved.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                disabled={isVerifyingActivePayment}
                onClick={() => {
                  setIsVerifyingActivePayment(true);
                  getOrderStatus(activePaymentOrder)
                    .then((statusData) => {
                      if (statusData.status === 'PAID' || statusData.paymentStatus === 'CAPTURED') {
                        sessionStorage.removeItem(ACTIVE_PAYMENT_KEY);
                        localStorage.removeItem(ACTIVE_PAYMENT_KEY);
                        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
                        localStorage.removeItem(CHECKOUT_DRAFT_KEY);
                        saveCartToStorage({ sets: {}, addons: {}, setTones: {} });
                        navigate(`/order/${activePaymentOrder}`, { state: { from: 'bottom' } });
                      } else {
                        setIsVerifyingActivePayment(false);
                        setErrors({ submit: 'Payment not yet confirmed by the bank. If money was debited, it will confirm in a few moments.' });
                      }
                    })
                    .catch(() => setIsVerifyingActivePayment(false));
                }}
                className="px-3 py-1.5 font-semibold bg-ink text-[#F4F3EE] rounded-sm hover:opacity-90 transition-opacity"
              >
                Check Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePaymentOrder(null);
                  sessionStorage.removeItem(ACTIVE_PAYMENT_KEY);
                  localStorage.removeItem(ACTIVE_PAYMENT_KEY);
                }}
                className="px-2 py-1.5 text-muted hover:text-ink transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* ── LEFT COLUMN: Shipping Form (7 cols) ── */}
          <div className="md:col-span-7 bg-surface border border-border rounded-lg p-5 sm:p-6">
            <h2 className="font-display text-base font-medium text-ink uppercase mb-5 pb-2.5 border-b border-border flex items-center justify-between">
              <span>Recipient Details</span>
              <span className="text-xs font-mono text-muted font-normal">India Only</span>
            </h2>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block uppercase tracking-wider font-medium text-ink mb-1">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full px-3 py-2.5 text-sm bg-bg border rounded-md focus:outline-none transition-colors ${
                    errors.fullName ? 'border-danger focus:border-danger' : 'border-border focus:border-ink'
                  }`}
                />
                {errors.fullName && <p className="text-danger mt-1">{errors.fullName}</p>}
              </div>

              {/* Mobile Phone Number */}
              <div>
                <label htmlFor="mobileNumber" className="block uppercase tracking-wider font-medium text-ink mb-1">
                  Mobile Number (for courier SMS) <span className="text-danger">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs font-mono font-medium bg-bg border border-r-0 border-border rounded-l-md text-muted">
                    +91
                  </span>
                  <input
                    id="mobileNumber"
                    type="tel"
                    maxLength={10}
                    autoComplete="tel"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      if (errors.mobileNumber) setErrors((prev) => ({ ...prev, mobileNumber: '' }));
                    }}
                    placeholder="9876543210"
                    className={`flex-1 px-3 py-2.5 text-sm bg-bg border rounded-r-md focus:outline-none transition-colors ${
                      errors.mobileNumber ? 'border-danger focus:border-danger' : 'border-border focus:border-ink'
                    }`}
                  />
                </div>
                {errors.mobileNumber && <p className="text-danger mt-1">{errors.mobileNumber}</p>}
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="email" className="block uppercase tracking-wider font-medium text-ink mb-1">
                  Email Address <span className="text-muted font-normal">(for receipt & Plus claim)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="e.g. rahul@example.com"
                  className={`w-full px-3 py-2.5 text-sm bg-bg border rounded-md focus:outline-none transition-colors ${
                    errors.email ? 'border-danger focus:border-danger' : 'border-border focus:border-ink'
                  }`}
                />
                {errors.email && <p className="text-danger mt-1">{errors.email}</p>}
              </div>

              {/* Address Line */}
              <div>
                <label htmlFor="addressLine" className="block uppercase tracking-wider font-medium text-ink mb-1">
                  Street / Flat / House Address <span className="text-danger">*</span>
                </label>
                <input
                  id="addressLine"
                  type="text"
                  autoComplete="street-address"
                  value={addressLine}
                  onChange={(e) => {
                    setAddressLine(e.target.value);
                    if (errors.addressLine) setErrors((prev) => ({ ...prev, addressLine: '' }));
                  }}
                  placeholder="e.g. Flat 402, Sunshine Apartments, 14th Main"
                  className={`w-full px-3 py-2.5 text-sm bg-bg border rounded-md focus:outline-none transition-colors ${
                    errors.addressLine ? 'border-danger focus:border-danger' : 'border-border focus:border-ink'
                  }`}
                />
                {errors.addressLine && <p className="text-danger mt-1">{errors.addressLine}</p>}
              </div>

              {/* Locality & Landmark */}
              <div>
                <label htmlFor="locality" className="block uppercase tracking-wider font-medium text-ink mb-1">
                  Locality / Landmark <span className="text-muted font-normal">(Optional)</span>
                </label>
                <input
                  id="locality"
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Near Metro Station / Indiranagar"
                  className="w-full px-3 py-2.5 text-sm bg-bg border border-border rounded-md focus:outline-none focus:border-ink transition-colors"
                />
              </div>

              {/* City, State, PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="city" className="block uppercase tracking-wider font-medium text-ink mb-1">
                    City <span className="text-danger">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
                    }}
                    placeholder="e.g. Mumbai"
                    className={`w-full px-3 py-2.5 text-sm bg-bg border rounded-md focus:outline-none transition-colors ${
                      errors.city ? 'border-danger focus:border-danger' : 'border-border focus:border-ink'
                    }`}
                  />
                  {errors.city && <p className="text-danger mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label htmlFor="state" className="block uppercase tracking-wider font-medium text-ink mb-1">
                    State <span className="text-danger">*</span>
                  </label>
                  <select
                    id="state"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      if (errors.state) setErrors((prev) => ({ ...prev, state: '' }));
                    }}
                    className={`w-full px-3 py-2.5 text-sm bg-bg border rounded-md focus:outline-none transition-colors ${
                      errors.state ? 'border-danger focus:border-danger' : 'border-border focus:border-ink'
                    }`}
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {errors.state && <p className="text-danger mt-1">{errors.state}</p>}
                </div>

                <div>
                  <label htmlFor="pincode" className="block uppercase tracking-wider font-medium text-ink mb-1">
                    PIN Code <span className="text-danger">*</span>
                  </label>
                  <input
                    id="pincode"
                    type="text"
                    maxLength={6}
                    autoComplete="postal-code"
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value);
                      if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' }));
                    }}
                    placeholder="400001"
                    className={`w-full px-3 py-2.5 text-sm bg-bg border rounded-md focus:outline-none transition-colors ${
                      errors.pincode ? 'border-danger focus:border-danger' : 'border-border focus:border-ink'
                    }`}
                  />
                  {errors.pincode && <p className="text-danger mt-1">{errors.pincode}</p>}
                </div>
              </div>

              {/* Consent and Terms */}
              <div className="pt-2 border-t border-border">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => {
                      setTermsAgreed(e.target.checked);
                      if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-border text-ink focus:ring-accent"
                  />
                  <span className="text-[12px] text-muted leading-relaxed">
                    I agree to the Terms of Service and understand that Kauntact physical tags include 12
                    months of Plus service across India.
                  </span>
                </label>
                {errors.terms && <p className="text-danger mt-1">{errors.terms}</p>}
              </div>

              {/* ── PLAIN RULE LINE FOR CARTS WITH > 2 TAGS ── */}
              {cartCalc.totalTags > 2 && (
                <div className="rounded-md bg-bg border border-border p-3 text-[13px] text-ink leading-relaxed">
                  After 12 months, renew Plus for ₹99/year to keep all your tags active. Without Plus, 2
                  tags keep working for calls.
                </div>
              )}

              {/* ── NOTE IF TOTAL TAGS EXCEED 8 ── */}
              {cartCalc.totalTags > 8 && (
                <div className="rounded-md bg-accent/20 border border-border-strong p-3 text-[13px] text-ink leading-relaxed font-medium">
                  Note: Plus covers up to 8 active tags under a single account.
                </div>
              )}

              {errors.submit && (
                <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errors.submit}</span>
                </div>
              )}

              {/* Secure Checkout Button */}
              <button
                type="submit"
                disabled={isSubmitting || cartCalc.itemCount === 0}
                className="w-full min-h-[44px] py-3 px-4 bg-ink text-surface text-sm font-medium rounded-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    <span>{progressStatus || 'Connecting to payment gateway...'}</span>
                  </span>
                ) : (
                  <span>Pay ₹{cartCalc.total} via Razorpay</span>
                )}
              </button>
            </form>
          </div>

          {/* ── RIGHT COLUMN: Itemized Cart & Steppers (5 cols) ── */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <h2 className="font-display text-xs uppercase tracking-wider text-muted font-semibold">
                  Cart ({cartCalc.itemCount})
                </h2>
                <Link to="/shop" className="text-xs text-ink hover:underline font-mono">
                  + Add more
                </Link>
              </div>

              {cartCalc.items.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">
                  No items in cart.{' '}
                  <Link to="/shop" className="text-ink underline">
                    Browse tags
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {cartCalc.items.map((it) => (
                    <div key={`${it.id}-${it.tone || 'def'}`} className="py-3 flex gap-3 items-center">
                      {it.image && (
                        <div className="w-14 h-14 rounded overflow-hidden border border-border bg-bg shrink-0">
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-baseline justify-between gap-1">
                          <p className="font-medium text-ink truncate">{it.name}</p>
                          <span className="font-mono font-semibold text-ink">
                            ₹{it.totalPrice}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted truncate">{it.subtitle}</p>

                        {/* 44px Stepper */}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center border border-border rounded bg-bg">
                            <button
                              type="button"
                              onClick={() => {
                                if (it.isSet) {
                                  updateSetQty(it.id, -1);
                                } else {
                                  updateAddonQty(it.id, -1);
                                }
                              }}
                              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-ink hover:bg-surface"
                              aria-label={`Decrease ${it.name}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 font-mono font-semibold text-ink">{it.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (it.isSet) {
                                  updateSetQty(it.id, 1);
                                } else {
                                  updateAddonQty(it.id, 1);
                                }
                              }}
                              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-ink hover:bg-surface"
                              aria-label={`Increase ${it.name}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-[11px] font-mono text-muted">
                            ₹{it.unitPrice} each
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary Rows: Subtotal, Delivery, Total with GST included */}
              <div className="pt-3 border-t border-border space-y-2 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span className="font-mono text-ink">₹{cartCalc.subtotal}</span>
                </div>

                <div className="flex justify-between text-muted">
                  <span>Delivery</span>
                  <span className="font-mono text-ink">
                    {cartCalc.isShippingFree ? 'Free' : `₹${cartCalc.shippingFee}`}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-border flex justify-between items-baseline font-medium text-sm">
                  <div>
                    <span className="text-ink">Total</span>
                    <span className="text-[11px] text-muted ml-1.5 font-normal">(GST included)</span>
                  </div>
                  <span className="font-mono text-base font-semibold text-ink">
                    ₹{cartCalc.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Reassurance list */}
            <div className="bg-surface border border-border rounded-lg p-4 space-y-2 text-xs text-muted">
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-ink shrink-0 mt-0.5" />
                <span>Dispatches within 24–48 hours via express courier.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-ink shrink-0 mt-0.5" />
                <span>First 2 tags work for calls with zero expiry.</span>
              </div>
            </div>
          </div>
        </div>
      </motion.main>

      <StoreFooter />
    </div>
  );
};
