import { Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminRedirect() {
    const { isSuperAdmin } = useAuth();
    if (isSuperAdmin) {
        return <Redirect href="/(admin)" />;
    }
    return <Redirect href="/(tabs)" />;
}
