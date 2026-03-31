import { Redirect } from 'expo-router';

export default function SubscriptionDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/subscription' as any} />;
}
