import { Redirect } from 'expo-router';

export default function LocationsDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/locations' as any} />;
}
