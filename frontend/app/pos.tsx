import { Redirect } from 'expo-router';

export default function PosDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/pos' as any} />;
}
