import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { stores as storesApi, Store } from '../services/api';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function StoreSelector() {
    const { t } = useTranslation();
    const { colors, glassStyle } = useTheme();
    const { user, switchStore, isLoading: authLoading } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');

    useEffect(() => {
        if (showModal) {
            loadStores();
        }
    }, [showModal]);

    async function loadStores() {
        setLoading(true);
        try {
            const list = await storesApi.list();
            setStores(list);
        } catch (e) {
            Alert.alert(t('common.error'), t('store_selector.load_error'));
        } finally {
            setLoading(false);
        }
    }

    async function handleSwitch(storeId: string) {
        if (storeId === user?.active_store_id) {
            setShowModal(false);
            return;
        }
        setLoading(true);
        try {
            await switchStore(storeId);
            setShowModal(false);
        } catch (e) {
            Alert.alert(t('common.error'), t('store_selector.switch_error'));
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateStore() {
        if (!newStoreName.trim()) return;
        setLoading(true);
        try {
            const newStore = await storesApi.create({ name: newStoreName.trim() });
            await switchStore(newStore.store_id); // Auto switch
            setShowCreateForm(false);
            setNewStoreName('');
            setShowModal(false);
        } catch (e) {
            Alert.alert(t('common.error'), t('store_selector.create_error'));
        } finally {
            setLoading(false);
        }
    }

    const activeStore = stores.find(s => s.store_id === user?.active_store_id) || { name: t('store_selector.default_name') };
    const styles = createStyles(colors, glassStyle);

    if (!user || user.role !== 'shopkeeper') return null;

    return (
        <>
            <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setShowModal(true)}
            >
                <Ionicons name="storefront-outline" size={20} color={colors.text} />
                <Text style={styles.selectorText} numberOfLines={1}>{activeStore.name}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {showModal && <Modal visible={showModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('store_selector.my_stores')}</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xl }} />
                        ) : (
                            <View>
                                {!showCreateForm ? (
                                    <>
                                        {stores.map(store => (
                                            <TouchableOpacity
                                                key={store.store_id}
                                                style={[
                                                    styles.storeItem,
                                                    store.store_id === user.active_store_id && styles.storeItemActive
                                                ]}
                                                onPress={() => handleSwitch(store.store_id)}
                                            >
                                                <View style={styles.storeIcon}>
                                                    <Ionicons
                                                        name={store.store_id === user.active_store_id ? "radio-button-on" : "radio-button-off"}
                                                        size={20}
                                                        color={store.store_id === user.active_store_id ? colors.primary : colors.textMuted}
                                                    />
                                                </View>
                                                <Text style={[
                                                    styles.storeName,
                                                    store.store_id === user.active_store_id && styles.storeNameActive
                                                ]}>{store.name}</Text>
                                            </TouchableOpacity>
                                        ))}

                                        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateForm(true)}>
                                            <Ionicons name="add" size={20} color={colors.primary} />
                                            <Text style={styles.createBtnText}>{t('store_selector.new_store')}</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.createForm}>
                                        <Text style={styles.subTitle}>{t('store_selector.new_store')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder={t('store_selector.store_name_placeholder')}
                                            placeholderTextColor={colors.textMuted}
                                            value={newStoreName}
                                            onChangeText={setNewStoreName}
                                            autoFocus
                                        />
                                        <View style={styles.formActions}>
                                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateForm(false)}>
                                                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.confirmBtn, !newStoreName.trim() && { opacity: 0.5 }]}
                                                onPress={handleCreateStore}
                                                disabled={!newStoreName.trim()}
                                            >
                                                <Text style={styles.confirmText}>{t('store_selector.create')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>}
        </>
    );
}

const createStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    selectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.glass,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        maxWidth: 200,
    },
    selectorText: {
        color: colors.text,
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginHorizontal: Spacing.xs,
        flexShrink: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: Spacing.md,
    },
    modalContent: {
        ...glassStyle,
        backgroundColor: colors.card,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.glassBorder,
        paddingBottom: Spacing.sm,
    },
    modalTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: colors.text,
    },
    storeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.glassBorder,
    },
    storeItemActive: {
        backgroundColor: colors.primary + '14',
    },
    storeIcon: {
        marginRight: Spacing.md,
    },
    storeName: {
        fontSize: FontSize.md,
        color: colors.textSecondary,
    },
    storeNameActive: {
        color: colors.text,
        fontWeight: '700',
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        marginTop: Spacing.sm,
    },
    createBtnText: {
        color: colors.primary,
        fontWeight: '600',
        marginLeft: Spacing.xs,
    },
    createForm: {
        paddingVertical: Spacing.sm,
    },
    subTitle: {
        color: colors.text,
        fontSize: FontSize.md,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    input: {
        ...glassStyle,
        backgroundColor: colors.inputBg,
        padding: Spacing.sm,
        color: colors.text,
        fontSize: FontSize.md,
        marginBottom: Spacing.md,
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    cancelBtn: {
        padding: Spacing.sm,
        marginRight: Spacing.sm,
    },
    cancelText: {
        color: colors.textMuted,
    },
    confirmBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    confirmText: {
        color: '#fff',
        fontWeight: '600',
    },
});
