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
    Alert as RNAlert,
    Switch,
    Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subUsers as subUsersApi, User, UserPermissions } from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';

export default function UsersScreen() {
    const { colors, glassStyle } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyles(colors, glassStyle);
    const router = useRouter();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [permissions, setPermissions] = useState<Record<string, 'none' | 'read' | 'write'>>({
        stock: 'none',
        accounting: 'none',
        crm: 'none',
        pos: 'read',
        suppliers: 'none',
    });

    const loadUsers = useCallback(async () => {
        try {
            const data = await subUsersApi.list();
            setUsers(data);
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

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setPermissions({
            stock: 'none',
            accounting: 'none',
            crm: 'none',
            pos: 'read',
            suppliers: 'none',
        });
        setEditingUser(null);
    };

    const handleShareInvitation = (user: User, pass?: string) => {
        const appUrl = "https://stockman.web.app"; // Replaced with actual URL if different
        const message = `Bonjour ${user.name} !\n\nVoici vos accès pour l'application Stockman :\n📧 Email : ${user.email}\n🔑 Mot de passe : ${pass || '********'}\n\nVous pouvez accéder à l'application ici : ${appUrl}\n\nBon travail !`;
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                RNAlert.alert('Erreur', 'WhatsApp n\'est pas installé sur cet appareil.');
            }
        });
    };

    const handleCreateOrUpdate = async () => {
        if (!name || !email || (!editingUser && !password)) {
            RNAlert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
            return;
        }

        try {
            if (editingUser) {
                await subUsersApi.update(editingUser.user_id, {
                    name,
                    permissions,
                });
            } else {
                const newUser = await subUsersApi.create({
                    email,
                    password,
                    name,
                    role: 'staff',
                    permissions,
                });

                RNAlert.alert(
                    'Compte créé',
                    'Voulez-vous envoyer les accès par WhatsApp ?',
                    [
                        { text: 'Plus tard', style: 'cancel' },
                        { text: 'Envoyer', onPress: () => handleShareInvitation(newUser, password) }
                    ]
                );
            }
            setModalVisible(false);
            resetForm();
            loadUsers();
        } catch (e: any) {
            RNAlert.alert('Erreur', e.message || 'Une erreur est survenue.');
        }
    };

    const handleDelete = (userId: string) => {
        RNAlert.alert(
            'Supprimer l\'utilisateur',
            'Êtes-vous sûr de vouloir supprimer cet utilisateur ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await subUsersApi.delete(userId);
                            loadUsers();
                        } catch (e: any) {
                            RNAlert.alert('Erreur', e.message || 'Une erreur est survenue.');
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
        setPermissions(user.permissions || {
            stock: 'none',
            accounting: 'none',
            crm: 'none',
            pos: 'read',
            suppliers: 'none',
        });
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

    const renderPermissionRow = (label: string, module: string) => {
        const level = permissions[module] || 'none';
        const color = level === 'write' ? colors.success : level === 'read' ? colors.primary : colors.textMuted;
        const icon = level === 'write' ? 'create' : level === 'read' ? 'eye' : 'close-circle';
        const text = level === 'write' ? 'Modification' : level === 'read' ? 'Lecture Seule' : 'Pas d\'accès';

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

    if (!currentUser || currentUser.role !== 'shopkeeper') {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: colors.text }}>Accès refusé.</Text>
            </View>
        );
    }

    return (
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
            <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gestion d'Équipe</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Link href="/(tabs)/activity" asChild>
                        <TouchableOpacity style={{ marginRight: 15 }}>
                            <Ionicons name="time-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </Link>
                    <TouchableOpacity
                        onPress={() => { resetForm(); setModalVisible(true); }}
                        style={styles.addBtn}
                    >
                        <Ionicons name="add" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
                {loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 50 }} />
                ) : users.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={64} color={colors.textMuted} />
                        <Text style={styles.emptyText}>Aucun employé configuré.</Text>
                        <Text style={styles.emptySubText}>Ajoutez vos vendeurs pour leur donner un accès limité.</Text>
                    </View>
                ) : (
                    users.map(u => (
                        <TouchableOpacity key={u.user_id} style={styles.userCard} onPress={() => openEdit(u)}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{u.name}</Text>
                                <Text style={styles.userEmail}>{u.email}</Text>
                                <View style={styles.userPerms}>
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
                                <TouchableOpacity onPress={() => handleShareInvitation(u)}>
                                    <Ionicons name="logo-whatsapp" size={20} color={colors.success} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(u.user_id)}>
                                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* modal create/edit */}
            {modalVisible && (
                <Modal visible={modalVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <LinearGradient colors={[colors.bgDark, colors.bgMid]} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingUser ? 'Modifier Accès' : 'Nouvel Employé'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ padding: Spacing.md }}>
                                <Text style={styles.inputLabel}>Nom complet</Text>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Ex: Jean Dupont"
                                    placeholderTextColor={colors.textMuted}
                                />

                                {!editingUser && (
                                    <>
                                        <Text style={styles.inputLabel}>Email</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="email@exemple.com"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                        <Text style={styles.inputLabel}>Mot de passe</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="Min. 8 caractères"
                                            secureTextEntry
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </>
                                )}

                                <Text style={styles.sectionTitle}>Permissions (Appuyez pour changer)</Text>
                                {renderPermissionRow('Caisse (POS)', 'pos')}
                                {renderPermissionRow('Stock & Produits', 'stock')}
                                {renderPermissionRow('Comptabilité', 'accounting')}
                                {renderPermissionRow('Clients (CRM)', 'crm')}
                                {renderPermissionRow('Fournisseurs', 'suppliers')}

                                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateOrUpdate}>
                                    <Text style={styles.saveBtnText}>{editingUser ? 'Enregistrer' : 'Créer le compte'}</Text>
                                </TouchableOpacity>
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </LinearGradient>
                    </View>
                </Modal>
            )}
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
