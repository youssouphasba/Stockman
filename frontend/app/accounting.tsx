import { Redirect } from 'expo-router';

export default function AccountingDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/accounting' as any} />;
}
