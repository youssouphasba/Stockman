import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Modal,
    Alert,
    Switch,
    Linking,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subUsers as subUsersApi, User, UserPermissions, stores as storesApi, Store, StorePermissions } from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

const getDefaultPermissions = () => ({
    stock: 'none' as const,
    accounting: 'none' as const,
    crm: 'none' as const,
    pos: 'read' as const,
    suppliers: 'none' as const,
    staff: 'none' as const,
});

const getDefaultAssignedStores = (currentUser?: User | null) => (
    currentUser?.active_store_id ? [currentUser.active_store_id] : []
);

const getPermissionMeta = (
    level: 'none' | 'read' | 'write',
    colors: any,
    t: any,
) => ({
    color: level === 'write' ? colors.success : level === 'read' ? colors.primary : colors.textMuted,
    icon: level === 'write' ? 'create' : level === 'read' ? 'eye' : 'close-circle',
    text: level === 'write' ? t('users.perm_management') : level === 'read' ? t('users.perm_read_only') : t('users.perm_no_access'),
});

export default function UsersScreen() {
    const { colors, glassStyle } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyles(colors, glassStyle);
    const router = useRouter();
    const { user: currentUser, isOrgAdmin, hasPermission } = useAuth();
    const { t } = useTranslation();

    const [users, setUsers] = useState<User[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [permissions, setPermissions] = useState<Record<string, 'none' | 'read' | 'write'>>(getDefaultPermissions);
    const [accountRoles, setAccountRoles] = useState<('billing_admin' | 'org_admin')[]>([]);
    const [assignedStoreIds, setAssignedStoreIds] = useState<string[]>(getDefaultAssignedStores(currentUser));
    const [storePermissions, setStorePermissions] = useState<StorePermissions>({});
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
    const canViewStaff = isOrgAdmin || hasPermission('staff', 'read');
    const canManageStaff = isOrgAdmin || hasPermission('staff', 'write');

    const loadUsers = useCallback(async () => {
        try {
            const [data, storesData] = await Promise.all([
                subUsersApi.list(),
                storesApi.list().catch(() => []),
            ]);
            setUsers(data);
            setStores(storesData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadUsers();
        }, [loadUsers])
    );

    const resetForm = useCallback(() => {
        setEmail('');
        setPassword('');
        setName('');
        setPermissions(getDefaultPermissions());
        setAccountRoles([]);
        setAssignedStoreIds(getDefaultAssignedStores(currentUser));
        setStorePermissions({});
        setExpandedStoreId(null);
        setEditingUser(null);
    }, [currentUser]);

    const handleShareInvitation = (user: User, pass?: string) => {
        const appUrl = "https://stockman.web.app"; // Replaced with actual URL if different
        const message = t('users.whatsapp_invite_msg', {
            name: user.name,
            email: user.email,
            password: pass || '********',
            url: appUrl
        });
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert(t('common.error'), t('users.error_whatsapp_not_installed'));
            }
        });
    };

    const handleCreateOrUpdate = async () => {
        if (!name || !email || (!editingUser && !password)) {
            Alert.alert(t('common.error'), t('users.form_error_fields'));
            return;
        }

        try {
            if (editingUser) {
                await subUsersApi.update(editingUser.user_id, {
                    name,
                    permissions,
                    account_roles: accountRoles,
                    store_ids: assignedStoreIds,
                    store_permissions: storePermissions,
                });
            } else {
                const newUser = await subUsersApi.create({
                    email,
                    password,
                    name,
                    role: 'staff',
                    permissions,
                    account_roles: accountRoles,
                    store_ids: assignedStoreIds,
                    store_permissions: storePermissions,
                });

                Alert.alert(
                    t('users.account_created_title'),
                    t('users.whatsapp_invite_prompt'),
                    [
                        { text: t('users.whatsapp_invite_later'), style: 'cancel' },
                        { text: t('users.whatsapp_invite_send'), onPress: () => handleShareInvitation(newUser, password) }
                    ]
                );
            }
            setModalVisible(false);
            resetForm();
            loadUsers();
        } catch (e: any) {
            Alert.alert(t('common.error'), e.message || t('common.error'));
        }
    };

    const handleDelete = (userId: string) => {
        Alert.alert(
            t('users.delete_user_title'),
            t('users.delete_user_confirm'),
            [
                { text: t('users.cancel_btn'), style: 'cancel' },
                {
                    text: t('users.delete_btn'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await subUsersApi.delete(userId);
                            loadUsers();
                        } catch (e: any) {
                            Alert.alert(t('common.error'), e.message || t('common.error'));
                        }
                    }
                },
            ]
        );
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setName(user.name);
        setEmail(user.email);
        setPermissions({ ...getDefaultPermissions(), ...(user.permissions || {}) });
        setAccountRoles(user.account_roles || []);
        setAssignedStoreIds(user.store_ids || getDefaultAssignedStores(currentUser));
        setStorePermissions(user.store_permissions || {});
        setExpandedStoreId((user.store_ids || [])[0] || null);
        setModalVisible(true);
    };

    const togglePermission = (module: string) => {
        setPermissions(prev => {
            const current = prev[module];
            let next: 'none' | 'read' | 'write' = 'none';
            if (current === 'none') next = 'read';
            else if (current === 'read') next = 'write';
            else next = 'none';
            return { ...prev, [module]: next };
        });
    };

    const toggleAccountRole = (role: 'billing_admin' | 'org_admin') => {
        if (role === 'org_admin' && !accountRoles.includes('org_admin')) {
            Alert.alert(
                'Admin opérations',
                'Ce rôle donne un accès complet aux opérations, aux magasins et à la gestion de l’équipe.',
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: 'Accorder', onPress: () => setAccountRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]) },
                ]
            );
            return;
        }
        setAccountRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const toggleStoreAssignment = (storeId: string) => {
        setAssignedStoreIds(prev => {
            if (prev.includes(storeId)) {
                const next = prev.filter(id => id !== storeId);
                setStorePermissions(current => {
                    const copy = { ...current };
                    delete copy[storeId];
                    return copy;
                });
                if (expandedStoreId === storeId) {
                    setExpandedStoreId(next[0] || null);
                }
                return next;
            }
            const next = [...prev, storeId];
            if (!expandedStoreId) setExpandedStoreId(storeId);
            return next;
        });
    };

    const toggleStorePermission = (storeId: string, module: keyof UserPermissions) => {
        setStorePermissions(prev => {
            const currentStorePermissions = { ...(prev[storeId] || {}) };
            const current = currentStorePermissions[module] || permissions[module] || 'none';
            const next = current === 'none' ? 'read' : current === 'read' ? 'write' : 'none';
            if (next === permissions[module]) {
                delete currentStorePermissions[module];
            } else {
                currentStorePermissions[module] = next;
            }
            const result = { ...prev };
            if (Object.keys(currentStorePermissions).length === 0) {
                delete result[storeId];
            } else {
                result[storeId] = currentStorePermissions;
            }
            return result;
        });
    };

    const renderPermissionRow = (label: string, module: string) => {
        const level = permissions[module] || 'none';
        const { color, icon, text } = getPermissionMeta(level, colors, t);

        return (
            <View style={styles.permRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.permLabel}>{label}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.permBadge, { backgroundColor: color + '20', borderColor: color }]}
                    onPress={() => togglePermission(module)}
                >
                    <Ionicons name={icon as any} size={14} color={color} style={{ marginRight: 4 }} />
                    <Text style={[styles.permBadgeText, { color }]}>{text}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderScopedPermissionRow = (storeId: string, label: string, module: keyof UserPermissions) => {
        const level = (storePermissions[storeId]?.[module] || permissions[module] || 'none') as 'none' | 'read' | 'write';
        const isOverridden = storePermissions[storeId]?.[module] !== undefined;
        const { color, icon, text } = getPermissionMeta(level, colors, t);

        return (
            <View style={styles.permRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.permLabel}>{label}</Text>
                    <Text style={styles.overrideHint}>
                        {isOverridden ? 'Spécifique à ce magasin' : 'Suit les permissions générales'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.permBadge, { backgroundColor: color + '20', borderColor: color }]}
                    onPress={() => toggleStorePermission(storeId, module)}
                >
                    <Ionicons name={icon as any} size={14} color={color} style={{ marginRight: 4 }} />
                    <Text style={[styles.permBadgeText, { color }]}>{text}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (!currentUser || !canViewStaff) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: colors.text }}>{t('users.access_denied')}</Text>
            </View>
        );
    }

    return (
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
            <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('users.title')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Link href="/(tabs)/activity" asChild>
                        <TouchableOpacity style={{ marginRight: 15 }}>
                            <Ionicons name="time-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </Link>
                    {canManageStaff && (
                        <TouchableOpacity
                            onPress={() => { resetForm(); setModalVisible(true); }}
                            style={styles.addBtn}
                        >
                            <Ionicons name="add" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
                {loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 50 }} />
                ) : users.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={64} color={colors.textMuted} />
                        <Text style={styles.emptyText}>{t('users.empty_state_title')}</Text>
                        <Text style={styles.emptySubText}>{t('users.empty_state_desc')}</Text>
                    </View>
                ) : (
                    users.map(u => (
                        <TouchableOpacity key={u.user_id} style={styles.userCard} onPress={() => canManageStaff && openEdit(u)} activeOpacity={canManageStaff ? 0.8 : 1}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.avatarText}>{(u.name || '?').charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{u.name}</Text>
                                <Text style={styles.userEmail}>{u.email}</Text>
                                {!!(u.store_ids || []).length && (
                                    <Text style={styles.storeSummary}>
                                        {(u.store_ids || []).length} magasin(s) assigne(s)
                                    </Text>
                                )}
                                <View style={styles.userPerms}>
                                    {(u.account_roles || []).map((role) => (
                                        <View key={role} style={[styles.miniBadge, { backgroundColor: colors.primary + '20' }]}>
                                            <Text style={[styles.miniBadgeText, { color: colors.primary }]}>
                                                {role === 'org_admin' ? 'ORG' : 'BILLING'}
                                            </Text>
                                        </View>
                                    ))}
                                    {Object.entries(u.permissions || {}).map(([mod, level]) => (
                                        level !== 'none' && (
                                            <View key={mod} style={[styles.miniBadge, { backgroundColor: level === 'write' ? colors.success + '20' : colors.primary + '20' }]}>
                                                <Text style={[styles.miniBadgeText, { color: level === 'write' ? colors.success : colors.primary }]}>
                                                    {mod.toUpperCase()}
                                                </Text>
                                            </View>
                                        )
                                    ))}
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 15 }}>
                                {canManageStaff && (
                                    <TouchableOpacity onPress={() => handleShareInvitation(u)}>
                                        <Ionicons name="logo-whatsapp" size={20} color={colors.success} />
                                    </TouchableOpacity>
                                )}
                                {canManageStaff && (
                                    <TouchableOpacity onPress={() => handleDelete(u.user_id)}>
                                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* modal create/edit */}
            {modalVisible && <Modal visible={modalVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <LinearGradient colors={[colors.bgDark, colors.bgMid]} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingUser ? t('users.edit_access_title') : t('users.new_employee_title')}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ padding: Spacing.md }}>
                                <Text style={styles.inputLabel}>{t('users.full_name_label')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder={t('users.full_name_placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                />

                                {!editingUser && (
                                    <>
                                        <Text style={styles.inputLabel}>{t('users.email_label')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="email@exemple.com"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                        <Text style={styles.inputLabel}>{t('users.password_label')}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder={t('users.password_placeholder')}
                                            secureTextEntry
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </>
                                )}

                                <Text style={styles.sectionTitle}>{t('users.permissions_section_title')}</Text>
                                {renderPermissionRow(t('users.pos_label'), 'pos')}
                                {renderPermissionRow(t('users.stock_label'), 'stock')}
                                {renderPermissionRow(t('users.accounting_label'), 'accounting')}
                                {renderPermissionRow(t('users.crm_label'), 'crm')}
                                {renderPermissionRow(t('users.suppliers_label'), 'suppliers')}
                                {renderPermissionRow(t('users.staff_label') || 'Gestion équipe', 'staff')}

                                <Text style={styles.sectionTitle}>Magasins assignes</Text>
                                <Text style={styles.sectionHelp}>
                                    Choisis les magasins visibles par cet employe. Les droits generaux s appliquent partout, puis tu peux affiner magasin par magasin.
                                </Text>
                                <View style={styles.storeList}>
                                    {stores.map((store) => {
                                        const selected = assignedStoreIds.includes(store.store_id);
                                        return (
                                            <Pressable
                                                key={store.store_id}
                                                style={[styles.storeChip, selected && styles.storeChipActive]}
                                                onPress={() => toggleStoreAssignment(store.store_id)}
                                            >
                                                <Ionicons
                                                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                                                    size={16}
                                                    color={selected ? colors.primary : colors.textMuted}
                                                />
                                                <Text style={[styles.storeChipText, selected && { color: colors.primary }]}>
                                                    {store.name}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {assignedStoreIds.map((storeId) => {
                                    const store = stores.find((item) => item.store_id === storeId);
                                    const isExpanded = expandedStoreId === storeId;
                                    return (
                                        <View key={storeId} style={styles.storeScopeCard}>
                                            <TouchableOpacity style={styles.storeScopeHeader} onPress={() => setExpandedStoreId(isExpanded ? null : storeId)}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.storeScopeTitle}>{store?.name || storeId}</Text>
                                                    <Text style={styles.overrideHint}>
                                                        {storePermissions[storeId] ? 'Droits specifiques configures' : 'Suit les permissions generales'}
                                                    </Text>
                                                </View>
                                                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                                            </TouchableOpacity>
                                            {isExpanded && (
                                                <View style={{ marginTop: Spacing.sm }}>
                                                    {renderScopedPermissionRow(storeId, t('users.pos_label'), 'pos')}
                                                    {renderScopedPermissionRow(storeId, t('users.stock_label'), 'stock')}
                                                    {renderScopedPermissionRow(storeId, t('users.accounting_label'), 'accounting')}
                                                    {renderScopedPermissionRow(storeId, t('users.crm_label'), 'crm')}
                                                    {renderScopedPermissionRow(storeId, t('users.suppliers_label'), 'suppliers')}
                                                    {renderScopedPermissionRow(storeId, t('users.staff_label') || 'Gestion equipe', 'staff')}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}

                                {isOrgAdmin && (
                                    <>
                                        <Text style={styles.sectionTitle}>Rôles du compte</Text>
                                        <Text style={styles.sectionHelp}>
                                            `Admin facturation` gere l abonnement. `Admin operations` gere les magasins, les modules et l equipe.
                                        </Text>
                                        <View style={styles.permRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.permLabel}>Admin facturation</Text>
                                            </View>
                                            <Switch
                                                value={accountRoles.includes('billing_admin')}
                                                onValueChange={() => toggleAccountRole('billing_admin')}
                                                trackColor={{ false: colors.divider, true: colors.primary + '60' }}
                                                thumbColor={accountRoles.includes('billing_admin') ? colors.primary : colors.textMuted}
                                            />
                                        </View>
                                        <View style={styles.permRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.permLabel}>Admin opérations</Text>
                                            </View>
                                            <Switch
                                                value={accountRoles.includes('org_admin')}
                                                onValueChange={() => toggleAccountRole('org_admin')}
                                                trackColor={{ false: colors.divider, true: colors.primary + '60' }}
                                                thumbColor={accountRoles.includes('org_admin') ? colors.primary : colors.textMuted}
                                            />
                                        </View>
                                    </>
                                )}

                                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateOrUpdate}>
                                    <Text style={styles.saveBtnText}>{editingUser ? t('users.save_btn') : t('users.create_account_btn')}</Text>
                                </TouchableOpacity>
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </LinearGradient>
                    </View>
                </Modal>}

        </LinearGradient>
    );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    gradient: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        paddingTop: Spacing.xl,
        backgroundColor: colors.bgDark,
        borderBottomWidth: 1,
        borderBottomColor: colors.glassBorder,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    addBtn: { padding: 4 },
    container: { flex: 1 },
    content: { padding: Spacing.md },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDark },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: colors.text, fontSize: FontSize.lg, fontWeight: '600', marginTop: Spacing.md },
    emptySubText: { color: colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
    userCard: {
        ...glassStyle,
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        marginBottom: Spacing.md,
        gap: Spacing.md,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { color: colors.primary, fontWeight: '700', fontSize: FontSize.lg },
    userInfo: { flex: 1 },
    userName: { color: colors.text, fontWeight: '700', fontSize: FontSize.md },
    userEmail: { color: colors.textMuted, fontSize: FontSize.sm },
    storeSummary: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    userPerms: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniBadgeText: { fontSize: 9, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.glassBorder,
    },
    modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    inputLabel: { color: colors.text, fontWeight: '600', marginBottom: 4, marginTop: Spacing.md },
    input: {
        ...glassStyle,
        backgroundColor: colors.bgDark + '50',
        padding: Spacing.md,
        color: colors.text,
        borderRadius: BorderRadius.md,
    },
    sectionTitle: { color: colors.primary, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.md },
    sectionHelp: { color: colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.sm, lineHeight: 18 },
    overrideHint: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    storeList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
    storeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        backgroundColor: colors.bgDark + '40',
    },
    storeChipActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '12',
    },
    storeChipText: { color: colors.text, fontSize: FontSize.sm, fontWeight: '600' },
    storeScopeCard: {
        ...glassStyle,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    storeScopeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    storeScopeTitle: { color: colors.text, fontWeight: '700', fontSize: FontSize.md },
    permRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.glassBorder,
    },
    permLabel: { color: colors.text, fontSize: FontSize.md },
    permBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 120,
        justifyContent: 'center',
    },
    permBadgeText: { fontSize: FontSize.xs, fontWeight: '600' },
    saveBtn: {
        backgroundColor: colors.primary,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});
