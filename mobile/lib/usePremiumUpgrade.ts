import { Alert } from 'react-native';
import { usePaymentsConfig, usePurchasePremium } from './queries';

// Shared premium-upgrade flow for the paywall and Profile. Handles the
// configured/unconfigured label, runs the purchase, and surfaces the outcome.
export function usePremiumUpgrade(onSuccess?: () => void) {
  const { data: config } = usePaymentsConfig();
  const purchase = usePurchasePremium();
  const configured = config?.configured === true;
  const priceLabel = config ? `Upgrade for ₹${Math.round(config.amount / 100)}` : 'Upgrade to Premium';

  async function upgrade() {
    if (!configured) {
      Alert.alert('Coming soon', 'Premium upgrades are launching soon. Thanks for your patience.');
      return;
    }
    const res = await purchase.mutateAsync();
    switch (res.status) {
      case 'success':
        Alert.alert('Welcome to Premium', 'Your premium access is now active. Enjoy the full library.');
        onSuccess?.();
        break;
      case 'pending':
        Alert.alert('Almost there', "If you completed the payment, premium unlocks shortly. Pull to refresh in a moment.");
        break;
      case 'already_premium':
        Alert.alert('You\'re all set', 'You already have MANAS Premium.');
        onSuccess?.();
        break;
      case 'unconfigured':
        Alert.alert('Coming soon', 'Premium upgrades are launching soon. Thanks for your patience.');
        break;
      case 'cancelled':
        break;
      default:
        Alert.alert('Payment not completed', res.status === 'error' ? res.message : 'Please try again.');
    }
  }

  return { configured, busy: purchase.isPending, upgrade, priceLabel };
}
