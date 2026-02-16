import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, isSupplier } = useAuth();
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <Redirect href={isSupplier ? '/(supplier-tabs)' : '/(tabs)'} />;
}
