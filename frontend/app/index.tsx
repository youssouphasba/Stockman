import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultRouteForUser } from '../utils/accountRouting';

export default function Index() {
  const { user, isAuthenticated, isSupplier, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    if (isSuperAdmin) return <Redirect href={'/(admin)' as any} />;
    if (isSupplier) return <Redirect href="/(supplier-tabs)" />;
    return <Redirect href={getDefaultRouteForUser(user) as any} />;
  }

  return <Redirect href={'/(auth)' as any} />;
}
