import { Redirect } from 'expo-router';

export default function ProductsDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/products' as any} />;
}
