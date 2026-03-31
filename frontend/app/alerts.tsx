import { Redirect } from 'expo-router';

export default function AlertsDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/alerts' as any} />;
}
