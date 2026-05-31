import * as WebBrowser from 'expo-web-browser';
import { api } from './api';

// Razorpay payment via a hosted Payment Link opened in the browser. This works
// in Expo Go and every build (no native module — react-native-razorpay does
// not support the New Architecture this app uses). Success is confirmed
// server-side by /payments/verify, which checks the link status with Razorpay.
export type PurchaseResult =
  | { status: 'success' }
  | { status: 'pending' }
  | { status: 'unconfigured' }
  | { status: 'already_premium' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function purchasePremium(): Promise<PurchaseResult> {
  let order: { url?: string; paymentLinkId?: string };
  try {
    const { data } = await api.post('/payments/create-order');
    order = data;
  } catch (err: unknown) {
    const e = err as { response?: { status?: number; data?: { error?: string } } };
    if (e?.response?.status === 501) return { status: 'unconfigured' };
    if (e?.response?.status === 409) return { status: 'already_premium' };
    return { status: 'error', message: e?.response?.data?.error ?? 'Could not start the payment.' };
  }

  if (!order?.url || !order?.paymentLinkId) {
    return { status: 'error', message: 'Payment could not be initialised.' };
  }
  const paymentLinkId = order.paymentLinkId;

  try {
    await WebBrowser.openBrowserAsync(order.url);
  } catch {
    // If the browser couldn't open we still attempt verification below.
  }

  // Razorpay may take a moment to mark the link paid after checkout, so retry.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await api.post('/payments/verify', { paymentLinkId });
      if (data?.isPremium) return { status: 'success' };
    } catch {
      // transient — retry
    }
    if (attempt < 2) await delay(2000);
  }
  return { status: 'pending' };
}
