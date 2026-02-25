import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, isSupplier, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    if (isSuperAdmin) return <Redirect href={'/(admin)' as any} />;
    if (isSupplier) return <Redirect href="/(supplier-tabs)" />;
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
