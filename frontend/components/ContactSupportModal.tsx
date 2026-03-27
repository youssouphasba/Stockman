import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { support, SupportTicket } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ContactSupportModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ContactSupportModal({ visible, onClose }: ContactSupportModalProps) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [tab, setTab] = useState<'new' | 'tickets'>('new');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Tickets state
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);

    const loadTickets = useCallback(async () => {
        setTicketsLoading(true);
        try {
            const result = await support.getMyTickets();
            setTickets(Array.isArray(result) ? result : []);
        } catch {
            // silent
        } finally {
            setTicketsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible && tab === 'tickets') {
            loadTickets();
        }
    }, [visible, tab]);

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            Alert.alert(t('modals.error'), t('auth.register.errorFillRequired'));
            return;
        }
        setLoading(true);
        try {
            await support.createTicket(subject, message);
            Alert.alert(t('modals.success'), t('modals.contactSupport.success'));
            setSubject('');
            setMessage('');
            setTab('tickets');
            loadTickets();
        } catch {
            Alert.alert(t('modals.error'), t('modals.contactSupport.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;
        setReplyLoading(true);
        try {
            const updated = await support.replyTicket(selectedTicket.ticket_id, replyText);
            setSelectedTicket(updated);
            setReplyText('');
            loadTickets();
        } catch {
            Alert.alert(t('modals.error'), t('modals.contactSupport.replyError'));
        } finally {
            setReplyLoading(false);
        }
    };

    const statusColor = (status: string) => {
        if (status === 'open') return '#f59e0b';
        if (status === 'pending') return colors.primary;
        return colors.success;
    };

    const statusLabel = (status: string) => {
        if (status === 'open') return t('modals.contactSupport.statusOpen');
        if (status === 'pending') return t('modals.contactSupport.statusPending');
        return t('modals.contactSupport.statusClosed');
    };

    // Ticket detail view
    if (selectedTicket) {
        return (
            {visible && <Modal visible={visible} animationType="slide" transparent>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={[styles.container, { backgroundColor: colors.glass, maxHeight: '90%' }]}
                    >
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => setSelectedTicket(null)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="arrow-back" size={20} color={colors.text} />
                                <Text style={[styles.title, { color: colors.text, marginLeft: 8, fontSize: 16 }]} numberOfLines={1}>
                                    {selectedTicket.subject}
                                </Text>
                            </TouchableOpacity>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor(selectedTicket.status) + '20' }]}>
                                <Text style={{ color: statusColor(selectedTicket.status), fontSize: 10, fontWeight: '700' }}>
                                    {statusLabel(selectedTicket.status)}
                                </Text>
                            </View>
                        </View>

                        <ScrollView style={{ flex: 1, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
                            {(selectedTicket.messages || []).map((msg, idx) => {
                                const isAdmin = msg.sender_name === 'Admin Stockman';
                                return (
                                    <View
                                        key={msg.message_id || idx}
                                        style={[
                                            styles.msgBubble,
                                            {
                                                backgroundColor: isAdmin ? colors.primary + '15' : colors.glass,
                                                borderColor: isAdmin ? colors.primary + '30' : colors.glassBorder,
                                                alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                                            }
                                        ]}
                                    >
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: isAdmin ? colors.primary : colors.textMuted, marginBottom: 4 }}>
                                            {isAdmin ? 'Stockman Support' : t('modals.contactSupport.you')}
                                        </Text>
                                        <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{msg.content}</Text>
                                        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4, textAlign: 'right' }}>
                                            {new Date(msg.created_at).toLocaleString()}
                                        </Text>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        {selectedTicket.status !== 'resolved' && (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TextInput
                                    style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.glassBorder }]}
                                    placeholder={t('modals.contactSupport.replyPlaceholder')}
                                    placeholderTextColor={colors.textMuted}
                                    value={replyText}
                                    onChangeText={setReplyText}
                                />
                                <TouchableOpacity
                                    style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleReply}
                                    disabled={replyLoading || !replyText.trim()}
                                >
                                    {replyLoading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Ionicons name="send" size={18} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </KeyboardAvoidingView>
                </View>
            </Modal>}
        );
    }

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[styles.container, { backgroundColor: colors.glass }]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('modals.contactSupport.title')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[styles.tab, tab === 'new' && { backgroundColor: colors.primary }]}
                            onPress={() => setTab('new')}
                        >
                            <Ionicons name="create-outline" size={16} color={tab === 'new' ? '#fff' : colors.textMuted} />
                            <Text style={[styles.tabText, { color: tab === 'new' ? '#fff' : colors.textMuted }]}>
                                {t('modals.contactSupport.newTicket')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, tab === 'tickets' && { backgroundColor: colors.primary }]}
                            onPress={() => setTab('tickets')}
                        >
                            <Ionicons name="chatbubbles-outline" size={16} color={tab === 'tickets' ? '#fff' : colors.textMuted} />
                            <Text style={[styles.tabText, { color: tab === 'tickets' ? '#fff' : colors.textMuted }]}>
                                {t('modals.contactSupport.myTickets')}
                            </Text>
                            {tickets.filter(t => t.status !== 'resolved').length > 0 && (
                                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                                        {tickets.filter(t => t.status !== 'resolved').length}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {tab === 'new' ? (
                        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                            <View style={styles.form}>
                                <Text style={[styles.label, { color: colors.textMuted }]}>{t('modals.contactSupport.subjectLabel')}</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.glassBorder }]}
                                    placeholder={t('modals.contactSupport.subjectPlaceholder')}
                                    placeholderTextColor={colors.textMuted}
                                    value={subject}
                                    onChangeText={setSubject}
                                />
                                <Text style={[styles.label, { color: colors.textMuted }]}>{t('modals.contactSupport.messageLabel')}</Text>
                                <TextInput
                                    style={[styles.textArea, { color: colors.text, borderColor: colors.glassBorder }]}
                                    placeholder={t('modals.contactSupport.messagePlaceholder')}
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
                                        <Text style={styles.submitText}>{t('modals.contactSupport.send')}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    ) : (
                        <View style={{ flex: 1 }}>
                            {ticketsLoading ? (
                                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                            ) : tickets.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
                                    <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 14 }}>
                                        {t('modals.contactSupport.noTickets')}
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {tickets.map((ticket) => {
                                        const lastMsg = ticket.messages?.[ticket.messages.length - 1];
                                        const hasAdminReply = ticket.messages?.some(m => m.sender_name === 'Admin Stockman');
                                        return (
                                            <TouchableOpacity
                                                key={ticket.ticket_id}
                                                style={[styles.ticketCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                                                onPress={() => setSelectedTicket(ticket)}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
                                                        {ticket.subject}
                                                    </Text>
                                                    <View style={[styles.statusBadge, { backgroundColor: statusColor(ticket.status) + '20' }]}>
                                                        <Text style={{ color: statusColor(ticket.status), fontSize: 9, fontWeight: '700' }}>
                                                            {statusLabel(ticket.status)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {lastMsg && (
                                                    <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={2}>
                                                        {lastMsg.sender_name === 'Admin Stockman' ? 'Support: ' : ''}{lastMsg.content}
                                                    </Text>
                                                )}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>
                                                        {new Date(ticket.updated_at).toLocaleDateString()}
                                                    </Text>
                                                    {hasAdminReply && (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                                                            <Text style={{ fontSize: 10, color: colors.success, marginLeft: 3, fontWeight: '600' }}>
                                                                {t('modals.contactSupport.replied')}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    )}
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
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    tabs: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
    },
    badge: {
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        marginLeft: 4,
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
    ticketCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    msgBubble: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        maxWidth: '85%',
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
