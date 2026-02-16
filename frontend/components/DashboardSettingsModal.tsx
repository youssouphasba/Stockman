import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { UserSettings } from '../services/api';

interface Props {
    visible: boolean;
    onClose: () => void;
    settings: UserSettings | null;
    onUpdate: (layout: NonNullable<UserSettings['dashboard_layout']>) => void;
}

export default function DashboardSettingsModal({ visible, onClose, settings, onUpdate }: Props) {
    const { colors } = useTheme();

    const layout = settings?.dashboard_layout || {
        show_kpi: true,
        show_stock_status: true,
        show_smart_reminders: true,
        show_forecast: true,
        show_recent_alerts: true,
        show_recent_sales: true,
        show_stock_chart: true,
        show_category_chart: true,
        show_abc_analysis: true,
        show_reorder: true,
        show_inventory_tasks: true,
        show_expiry_alerts: true,
        show_profitability: true,
    };

    const toggle = (key: keyof typeof layout) => {
        onUpdate({
            ...layout,
            [key]: !layout[key],
        });
    };

    const widgets = [
        { key: 'show_kpi', label: 'KPIs (CA, Ventes, etc.)', icon: 'stats-chart-outline' },
        { key: 'show_profitability', label: 'Rentabilité par catégorie', icon: 'cash-outline' },
        { key: 'show_stock_status', label: 'Statut des stocks', icon: 'cube-outline' },
        { key: 'show_smart_reminders', label: 'Rappels intelligents', icon: 'bulb-outline' },
        { key: 'show_forecast', label: 'Prévisions de ventes', icon: 'trending-up-outline' },
        { key: 'show_recent_alerts', label: 'Alertes récentes', icon: 'notifications-outline' },
        { key: 'show_recent_sales', label: 'Dernières ventes', icon: 'receipt-outline' },
        { key: 'show_stock_chart', label: 'Évolution valeur stock', icon: 'analytics-outline' },
        { key: 'show_category_chart', label: 'Répartition par catégorie', icon: 'pie-chart-outline' },
        { key: 'show_abc_analysis', label: 'Analyse ABC', icon: 'list-outline' },
        { key: 'show_reorder', label: 'Réapprovisionnement', icon: 'refresh-outline' },
        { key: 'show_inventory_tasks', label: 'Tâches inventaire', icon: 'checkbox-outline' },
        { key: 'show_expiry_alerts', label: 'Alertes péremption', icon: 'time-outline' },
    ];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={[styles.modalView, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Personnaliser le Dashboard</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Activez ou désactivez les éléments que vous souhaitez voir sur votre écran d'accueil.
                    </Text>

                    <ScrollView style={styles.scrollView}>
                        {widgets.map((item) => (
                            <View key={item.key} style={[styles.item, { borderBottomColor: colors.border }]}>
                                <View style={styles.itemLeft}>
                                    <Ionicons name={item.icon as any} size={22} color={colors.primary} style={styles.icon} />
                                    <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: '#767577', true: colors.primaryLight }}
                                    thumbColor={layout[item.key as keyof typeof layout] ? colors.primary : '#f4f3f4'}
                                    onValueChange={() => toggle(item.key as keyof typeof layout)}
                                    value={layout[item.key as keyof typeof layout]}
                                />
                            </View>
                        ))}
                        <View style={{ height: 40 }} />
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        onPress={onClose}
                    >
                        <Text style={styles.saveButtonText}>Terminer</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        height: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 20,
    },
    closeButton: {
        padding: 5,
    },
    scrollView: {
        flex: 1,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 15,
        width: 25,
    },
    itemLabel: {
        fontSize: 16,
    },
    saveButton: {
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
