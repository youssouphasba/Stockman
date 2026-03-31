import { Redirect } from 'expo-router';

export default function CrmDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/crm' as any} />;
}
