import { Redirect } from 'expo-router';

export default function SettingsDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/settings' as any} />;
}
