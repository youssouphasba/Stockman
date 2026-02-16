import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { support } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface ContactSupportModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ContactSupportModal({ visible, onClose }: ContactSupportModalProps) {
    const { colors } = useTheme();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        setLoading(true);
        try {
            await support.createTicket(subject, message);
            Alert.alert('Succès', 'Votre message a été envoyé à l\'administrateur. Nous vous répondrons bientôt.');
            setSubject('');
            setMessage('');
            onClose();
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible d\'envoyer le message pour le moment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[styles.container, { backgroundColor: colors.glass }]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Contacter le Support</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Sujet</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.glassBorder }]}
                            placeholder="Ex: Problème d'impression, Suggestion..."
                            placeholderTextColor={colors.textMuted}
                            value={subject}
                            onChangeText={setSubject}
                        />

                        <Text style={[styles.label, { color: colors.textMuted }]}>Message</Text>
                        <TextInput
                            style={[styles.textArea, { color: colors.text, borderColor: colors.glassBorder }]}
                            placeholder="Dites-nous comment nous pouvons vous aider..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={6}
                            value={message}
                            onChangeText={setMessage}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: colors.primary }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>Envoyer le message</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    form: {
        gap: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        height: 120,
        textAlignVertical: 'top',
    },
    submitButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
