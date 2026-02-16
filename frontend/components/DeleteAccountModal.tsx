import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { profile } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Spacing, FontSize, BorderRadius } from '../constants/theme';

interface DeleteAccountModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function DeleteAccountModal({ visible, onClose }: DeleteAccountModalProps) {
    const { colors, glassStyle } = useTheme();
    const { logout } = useAuth();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const styles = getStyles(colors, glassStyle);

    const handleDelete = async () => {
        if (!password) {
            Alert.alert('Erreur', 'Veuillez entrer votre mot de passe pour confirmer.');
            return;
        }

        Alert.alert(
            'Confirmation ultime',
            'Cette action est irréversible. Toutes vos données (magasins, ventes, clients) seront effacées définitivement. Êtes-vous vraiment sûr ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Tout supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await profile.deleteAccount(password);
                            Alert.alert('Adieu', 'Votre compte a été supprimé avec succès.');
                            onClose();
                            logout();
                        } catch (error: any) {
                            Alert.alert('Erreur', 'Impossible de supprimer le compte. Vérifiez votre mot de passe.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Zone de Danger ⚠️</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.warningBox}>
                            <Ionicons name="warning" size={32} color={colors.danger} />
                            <Text style={styles.warningText}>
                                Vous êtes sur le point de supprimer définitivement votre compte et toutes les données associées.
                            </Text>
                        </View>

                        <Text style={styles.label}>Mot de passe de confirmation</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Entrez votre mot de passe"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={[styles.deleteButton, loading && { opacity: 0.7 }]}
                            onPress={handleDelete}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="trash-outline" size={20} color="#fff" />
                                    <Text style={styles.deleteButtonText}>Supprimer mon compte</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: Spacing.md,
    },
    modalContainer: {
        ...glassStyle,
        backgroundColor: colors.bgMid,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: colors.danger,
    },
    content: {
        padding: Spacing.md,
    },
    warningBox: {
        backgroundColor: colors.danger + '20',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: colors.danger + '50',
    },
    warningText: {
        color: colors.danger,
        textAlign: 'center',
        marginTop: Spacing.sm,
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    label: {
        fontSize: FontSize.sm,
        color: colors.textSecondary,
        marginBottom: Spacing.xs,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.inputBg,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        marginBottom: Spacing.xl,
    },
    deleteButton: {
        backgroundColor: colors.danger,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: FontSize.md,
    },
});
