import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { chat, ChatMessage, Conversation } from '../services/api';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  partnerId?: string;
  partnerName?: string;
};

export default function ChatModal({ visible, onClose, partnerId, partnerName }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      if (partnerId && partnerName) {
        openDirectChat(partnerId, partnerName);
      } else {
        setView('list');
        loadConversations();
      }
    } else {
      stopPolling();
      setActiveConvo(null);
      setMessages([]);
      setView('list');
    }
  }, [visible, partnerId, partnerName]);

  async function loadConversations() {
    setLoading(true);
    try {
      const convos = await chat.listConversations();
      setConversations(convos);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  async function openDirectChat(pid: string, pname: string) {
    setLoading(true);
    setView('chat');
    try {
      const convo = await chat.createConversation(pid, pname);
      setActiveConvo(convo);
      await loadMessages(convo.conversation_id);
      startPolling(convo.conversation_id);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(convo: Conversation) {
    setActiveConvo(convo);
    setView('chat');
    setLoading(true);
    try {
      await loadMessages(convo.conversation_id);
      startPolling(convo.conversation_id);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(convoId: string) {
    try {
      const result = await chat.getMessages(convoId, 0, 100);
      setMessages((result.items ?? []).reverse());
    } catch {
      setMessages([]);
    }
  }

  function startPolling(convoId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const result = await chat.getMessages(convoId, 0, 100);
        setMessages((result.items ?? []).reverse());
      } catch { /* ignore */ }
    }, 5000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !activeConvo || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const msg = await chat.sendMessage(activeConvo.conversation_id, text);
      setMessages(prev => [...prev, msg]);
      // Update conversation last message
      setActiveConvo(prev => prev ? { ...prev, last_message: text, last_message_at: msg.created_at } : prev);
    } catch {
      setNewMessage(text); // Restore on error
    } finally {
      setSending(false);
    }
  }

  function goBackToList() {
    stopPolling();
    setActiveConvo(null);
    setMessages([]);
    setView('list');
    loadConversations();
  }

  function getPartnerName(convo: Conversation) {
    if (!user) return '';
    return user.user_id === convo.shopkeeper_id ? convo.supplier_name : convo.shopkeeper_name;
  }

  function getUnreadCount(convo: Conversation) {
    if (!user) return 0;
    return user.user_id === convo.shopkeeper_id ? convo.unread_shopkeeper : convo.unread_supplier;
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isMe = item.sender_id === user?.user_id;
    return (
      <View style={[
        styles.messageBubble,
        isMe ? { alignSelf: 'flex-end', backgroundColor: colors.primary } : { alignSelf: 'flex-start', backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
        { maxWidth: '80%' }
      ]}>
        {!isMe && (
          <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700', marginBottom: 2 }}>
            {item.sender_name}
          </Text>
        )}
        <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
          {item.content}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 }}>
          <Text style={{ fontSize: 9, color: isMe ? 'rgba(255,255,255,0.6)' : colors.textMuted }}>
            {formatTime(item.created_at)}
          </Text>
          {isMe && (
            <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={12} color={item.read ? '#4FC3F7' : 'rgba(255,255,255,0.5)'} />
          )}
        </View>
      </View>
    );
  }, [user, colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.container, { backgroundColor: colors.bgMid }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            {view === 'chat' && !partnerId ? (
              <TouchableOpacity onPress={goBackToList} style={{ padding: 4 }}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {view === 'chat' && activeConvo ? getPartnerName(activeConvo) : 'Messages'}
              </Text>
              {view === 'chat' && activeConvo && (
                <Text style={{ fontSize: 10, color: colors.textMuted }}>
                  {user?.user_id === activeConvo.shopkeeper_id ? 'Fournisseur' : 'Commerçant'}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading && messages.length === 0 && conversations.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : view === 'list' ? (
            /* Conversations list */
            conversations.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.md }}>
                  Aucune conversation
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.xs }}>
                  Ouvrez le profil d'un fournisseur sur la Marketplace pour démarrer une conversation
                </Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={c => c.conversation_id}
                renderItem={({ item: convo }) => {
                  const partner = getPartnerName(convo);
                  const unread = getUnreadCount(convo);
                  const initials = partner.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <TouchableOpacity
                      style={[styles.convoItem, { borderBottomColor: colors.divider }]}
                      onPress={() => openConversation(convo)}
                    >
                      <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={[styles.convoName, { color: colors.text }]} numberOfLines={1}>{partner}</Text>
                          {convo.last_message_at && (
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>{formatTime(convo.last_message_at)}</Text>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                          <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1 }} numberOfLines={1}>
                            {convo.last_message || 'Nouvelle conversation'}
                          </Text>
                          {unread > 0 && (
                            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                              <Text style={styles.unreadText}>{unread}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )
          ) : (
            /* Chat view */
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={m => m.message_id}
                renderItem={renderMessage}
                contentContainerStyle={{ padding: Spacing.md, gap: 6 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', padding: Spacing.xxl }}>
                    <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, marginTop: Spacing.sm }}>{t('modals.chat_empty')}</Text>
                  </View>
                }
              />

              {/* Input bar */}
              <View style={[styles.inputBar, { backgroundColor: colors.bgDark, borderTopColor: colors.divider }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.glass, color: colors.text, borderColor: colors.glassBorder }]}
                  placeholder="Écrire un message..."
                  placeholderTextColor={colors.textMuted}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={1000}
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!newMessage.trim() || sending}
                  style={[styles.sendBtn, { backgroundColor: newMessage.trim() ? colors.primary : colors.glass }]}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color={newMessage.trim() ? '#fff' : colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  convoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: FontSize.md, fontWeight: '800' },
  convoName: { fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  messageBubble: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginVertical: 1,
  },
  messageText: { fontSize: FontSize.sm, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
});
