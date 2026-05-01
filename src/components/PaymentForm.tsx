"use client";

import { useEffect, useRef, useState } from "react";

type PaymentFormProps = {
  amount: number; // in cents
  description: string;
  onSuccess?: (paymentId: string, receiptUrl?: string) => void;
  onError?: (error: string) => void;
};

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<Payments>;
    };
  }
}

interface Payments {
  card: () => Promise<PaymentMethod>;
  applePay: (request: ApplePayRequest) => Promise<PaymentMethod>;
  googlePay: (request: GooglePayRequest) => Promise<PaymentMethod>;
}

interface PaymentMethod {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
}

interface ApplePayRequest {
  countryCode: string;
  currencyCode: string;
  total: { amount: string; label: string };
}

interface GooglePayRequest {
  countryCode: string;
  currencyCode: string;
  total: { amount: string; label: string };
}

export default function PaymentForm({ amount, description, onSuccess, onError }: PaymentFormProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const cardRef = useRef<PaymentMethod | null>(null);
  const applePayRef = useRef<PaymentMethod | null>(null);
  const googlePayRef = useRef<PaymentMethod | null>(null);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || "";
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";

  useEffect(() => {
    if (!appId || !locationId) {
      setError("Payment system not configured");
      setLoading(false);
      return;
    }

    // Load Square Web Payments SDK
    const script = document.createElement("script");
    script.src = "https://sandbox.web.squarecdn.com/v1/square.js";
    if (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production") {
      script.src = "https://web.squarecdn.com/v1/square.js";
    }
    script.async = true;
    script.onload = initializePayments;
    script.onerror = () => {
      setError("Failed to load payment SDK");
      setLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initializePayments() {
    if (!window.Square) {
      setError("Payment SDK not available");
      setLoading(false);
      return;
    }

    try {
      const payments = await window.Square.payments(appId, locationId);

      // Initialize card payment
      const card = await payments.card();
      await card.attach("#card-container");
      cardRef.current = card;

      // Try Apple Pay
      try {
        const applePay = await payments.applePay({
          countryCode: "US",
          currencyCode: "USD",
          total: { amount: (amount / 100).toFixed(2), label: "NOHO Mailbox" },
        });
        applePayRef.current = applePay;
        setApplePayAvailable(true);
      } catch {
        // Apple Pay not available
      }

      // Try Google Pay
      try {
        const googlePay = await payments.googlePay({
          countryCode: "US",
          currencyCode: "USD",
          total: { amount: (amount / 100).toFixed(2), label: "NOHO Mailbox" },
        });
        await googlePay.attach("#google-pay-container");
        googlePayRef.current = googlePay;
        setGooglePayAvailable(true);
      } catch {
        // Google Pay not available
      }

      setLoading(false);
    } catch (err) {
      setError("Failed to initialize payments");
      setLoading(false);
      console.error(err);
    }
  }

  async function processPayment(paymentMethod: PaymentMethod) {
    setProcessing(true);
    setError(null);

    try {
      const result = await paymentMethod.tokenize();

      if (result.status !== "OK" || !result.token) {
        setError(result.errors?.[0]?.message || "Payment failed");
        setProcessing(false);
        return;
      }

      // Send token to our API
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: result.token,
          amount,
          currency: "USD",
          note: description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Payment failed");
        onError?.(data.error);
      } else {
        setSuccess(true);
        onSuccess?.(data.paymentId, data.receiptUrl);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      setError(msg);
      onError?.(msg);
    } finally {
      setProcessing(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-black text-text-light">Payment Successful!</h3>
        <p className="text-sm text-text-light/60 mt-1">${(amount / 100).toFixed(2)} paid</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-sm text-text-light/60">{description}</p>
        <p className="text-2xl font-black text-text-light">${(amount / 100).toFixed(2)}</p>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-pulse text-sm text-text-light/50">Loading payment methods...</div>
        </div>
      )}

      {error && (
        <div className="text-center py-3 px-4 rounded-xl text-sm font-bold text-red-600" style={{ background: "rgba(200,50,50,0.08)" }}>
          {error}
        </div>
      )}

      {/* Apple Pay */}
      {applePayAvailable && (
        <button
          onClick={() => applePayRef.current && processPayment(applePayRef.current)}
          disabled={processing}
          className="w-full py-3 rounded-xl bg-black text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
           Pay with Apple Pay
        </button>
      )}

      {/* Google Pay */}
      <div id="google-pay-container" className={googlePayAvailable ? "" : "hidden"} />

      {/* Divider */}
      {(applePayAvailable || googlePayAvailable) && !loading && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border-light" />
          <span className="text-xs text-text-light/40 font-bold">OR PAY WITH CARD</span>
          <div className="flex-1 h-px bg-border-light" />
        </div>
      )}

      {/* Card form */}
      <div id="card-container" className={loading ? "hidden" : ""} style={{ minHeight: 90 }} />

      {/* Card logos */}
      {!loading && (
        <div className="flex items-center justify-center gap-3 text-[10px] text-text-light/30 font-bold uppercase tracking-wider">
          <span>Visa</span>
          <span>&middot;</span>
          <span>Mastercard</span>
          <span>&middot;</span>
          <span>Amex</span>
          <span>&middot;</span>
          <span>Discover</span>
        </div>
      )}

      {/* Pay button */}
      {!loading && (
        <button
          onClick={() => cardRef.current && processPayment(cardRef.current)}
          disabled={processing}
          className="w-full py-3.5 rounded-xl text-white font-black text-sm disabled:opacity-50 transition-opacity"
          style={{
            background: "linear-gradient(135deg, #337485, #23596A)",
            boxShadow: "0 2px 10px rgba(51,116,133,0.3)",
          }}
        >
          {processing ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
      )}

      <p className="text-[10px] text-center text-text-light/30">
        Payments securely processed by Square
      </p>
    </div>
  );
}
