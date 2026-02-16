import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { activityLogs, ActivityLog } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ActivityScreen() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadLogs = async () => {
        try {
            const data = await activityLogs.list();
            setLogs(data.items ?? data as any);
        } catch (e) {
            console.error('Error loading logs:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadLogs();
    };

    const getIcon = (module: string, action: string) => {
        switch (module) {
            case 'stock': return 'cube-outline';
            case 'pos': return 'cart-outline';
            case 'crm': return 'people-outline';
            case 'accounting': return 'stats-chart-outline';
            default: return 'flash-outline';
        }
    };

    const getColor = (module: string) => {
        switch (module) {
            case 'stock': return colors.primary;
            case 'pos': return colors.success;
            case 'crm': return colors.secondary;
            case 'accounting': return colors.warning;
            default: return colors.textSecondary;
        }
    };

    const renderLog = ({ item }: { item: ActivityLog }) => (
        <View style={styles.logCard}>
            <View style={[styles.iconContainer, { backgroundColor: getColor(item.module) + '20' }]}>
                <Ionicons name={getIcon(item.module, item.action)} size={24} color={getColor(item.module)} />
            </View>
            <View style={styles.logContent}>
                <View style={styles.logHeader}>
                    <Text style={[styles.userName, { color: colors.text }]}>{item.user_name}</Text>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>
                        {format(new Date(item.created_at), 'HH:mm', { locale: fr })}
                    </Text>
                </View>
                <Text style={[styles.description, { color: colors.text }]}>{item.description}</Text>
                <Text style={[styles.date, { color: colors.textSecondary }]}>
                    {format(new Date(item.created_at), 'PPP', { locale: fr })}
                </Text>
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { backgroundColor: colors.bgDark, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
            <LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.headerTitle}>Historique d'Activité</Text>
                <Text style={styles.headerSubtitle}>Suivi des actions de votre équipe</Text>
            </LinearGradient>

            <FlatList
                data={logs}
                renderItem={renderLog}
                keyExtractor={(item) => item.log_id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="documents-outline" size={64} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune activité enregistrée</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingTop: 60,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 5,
    },
    listContainer: {
        padding: 15,
    },
    logCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    logContent: {
        flex: 1,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    time: {
        fontSize: 12,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    date: {
        fontSize: 11,
        marginTop: 5,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
    },
});
