import { Redirect } from 'expo-router';

export default function PlannerDeepLinkRedirect() {
  return <Redirect href={'/(tabs)/planner' as any} />;
}
