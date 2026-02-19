import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { stores as storesApi, Store } from '../services/api';
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

export default function StoreSelector() {
    const { t } = useTranslation();
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

    if (!user || user.role !== 'shopkeeper') return null;

    return (
        <>
            <TouchableOpacity
                style={styles.selectorBtn}
                onPress={() => setShowModal(true)}
            >
                <Ionicons name="storefront-outline" size={20} color={Colors.text} />
                <Text style={styles.selectorText} numberOfLines={1}>{activeStore.name}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <Modal visible={showModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('store_selector.my_stores')}</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
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
                                                        color={store.store_id === user.active_store_id ? Colors.primary : Colors.textMuted}
                                                    />
                                                </View>
                                                <Text style={[
                                                    styles.storeName,
                                                    store.store_id === user.active_store_id && styles.storeNameActive
                                                ]}>{store.name}</Text>
                                            </TouchableOpacity>
                                        ))}

                                        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateForm(true)}>
                                            <Ionicons name="add" size={20} color={Colors.primary} />
                                            <Text style={styles.createBtnText}>{t('store_selector.new_store')}</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.createForm}>
                                        <Text style={styles.subTitle}>{t('store_selector.new_store')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder={t('store_selector.store_name_placeholder')}
                                            placeholderTextColor={Colors.textMuted}
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
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    selectorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.glass,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        maxWidth: 200,
    },
    selectorText: {
        color: Colors.text,
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
        ...GlassStyle,
        backgroundColor: Colors.bgMid,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
        paddingBottom: Spacing.sm,
    },
    modalTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.text,
    },
    storeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.glassBorder,
    },
    storeItemActive: {
        backgroundColor: Colors.primary + '10', // 10% opacity
    },
    storeIcon: {
        marginRight: Spacing.md,
    },
    storeName: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
    },
    storeNameActive: {
        color: Colors.text,
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
        color: Colors.primary,
        fontWeight: '600',
        marginLeft: Spacing.xs,
    },
    createForm: {
        paddingVertical: Spacing.sm,
    },
    subTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    input: {
        ...GlassStyle,
        backgroundColor: Colors.bgDark,
        padding: Spacing.sm,
        color: Colors.text,
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
        color: Colors.textMuted,
    },
    confirmBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    confirmText: {
        color: '#fff',
        fontWeight: '600',
    },
});
