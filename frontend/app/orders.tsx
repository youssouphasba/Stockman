import { Redirect } from 'expo-router';

export default function OrdersDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/orders' as any} />;
}
