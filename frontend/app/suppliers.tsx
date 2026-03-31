import { Redirect } from 'expo-router';

export default function SuppliersDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/suppliers' as any} />;
}
