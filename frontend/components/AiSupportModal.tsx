import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { ai } from '../services/api';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
};

type AiSupportModalProps = {
    visible: boolean;
    onClose: () => void;
};

export default function AiSupportModal({ visible, onClose }: AiSupportModalProps) {
    const { colors, glassStyle } = useTheme();
    const styles = getStyles(colors, glassStyle);
    const markdownStyles = getMarkdownStyles(colors);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Bonjour ! Je suis votre assistant Stockman. Comment puis-je vous aider aujourd'hui ?",
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const listRef = useRef<FlatList>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const recordingRef = useRef<Audio.Recording | null>(null);

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            recordingRef.current = recording;
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        if (!recordingRef.current) return;
        setIsRecording(false);
        setIsTranscribing(true);

        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            if (!uri) throw new Error('No recording URI');

            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const result = await ai.voiceToText(base64);
            if (result.transcription) {
                setInputText(result.transcription);
            }
        } catch (err) {
            console.error('Voice transcription failed', err);
        } finally {
            setIsTranscribing(false);
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });
        }
    };

    const handleMicPress = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const data = await ai.getHistory();
            if (data.messages && data.messages.length > 0) {
                // Map backend messages to frontend format
                const mappedMessages: Message[] = data.messages.map((msg: any, index: number) => ({
                    id: `hist_${index}`,
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content,
                    timestamp: new Date(msg.timestamp),
                }));
                // Ensure we have at least the welcome message if empty? No, history replaces it.
                // But typically we want the welcome message if history is empty.
                if (mappedMessages.length > 0) {
                    setMessages(mappedMessages);
                }
            }
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleClearHistory = async () => {
        try {
            await ai.clearHistory();
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: "Historique effacé. Comment puis-je vous aider ?",
                timestamp: new Date(),
            }]);
        } catch (error) {
            console.error('Failed to clear history', error);
        }
    };

    useEffect(() => {
        if (visible) {
            loadHistory();
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 500);
        }
    }, [visible]);

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            // Prepare history for API (last 10 messages for context)
            const history = messages.slice(-10).map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                content: m.content,
            }));

            const response = await ai.support(userMessage.content, history);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            const detail = error?.message || error?.toString() || 'Erreur inconnue';
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Erreur : ${detail}`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.aiWrapper]}>
                {!isUser && (
                    <View style={styles.aiAvatar}>
                        <Ionicons name="sparkles" size={16} color="#fff" />
                    </View>
                )}
                <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
                    {isUser ? (
                        <Text style={[styles.messageText, styles.userText]}>
                            {item.content}
                        </Text>
                    ) : (
                        <Markdown style={markdownStyles}>
                            {item.content}
                        </Markdown>
                    )}
                    <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.headerTitleRow}>
                            <View style={styles.aiAvatarSmall}>
                                <Ionicons name="sparkles" size={12} color="#fff" />
                            </View>
                            <Text style={styles.modalTitle}>Assistant IA</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <TouchableOpacity onPress={handleClearHistory} style={styles.closeBtn}>
                                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <FlatList
                        ref={listRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                    />

                    {isLoading && (
                        <View style={styles.loadingBubble}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.loadingText}>L'IA réfléchit...</Text>
                        </View>
                    )}

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                    >
                        <View style={styles.inputArea}>
                            <TextInput
                                style={styles.input}
                                placeholder={isRecording ? '🎙️ Enregistrement...' : 'Posez votre question...'}
                                placeholderTextColor={isRecording ? colors.danger : colors.textMuted}
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                maxLength={500}
                                editable={!isRecording}
                            />
                            <TouchableOpacity
                                onPress={handleMicPress}
                                disabled={isLoading || isTranscribing}
                                style={[
                                    styles.micBtn,
                                    isRecording && styles.micBtnActive,
                                    (isLoading || isTranscribing) && styles.sendBtnDisabled,
                                ]}
                            >
                                {isTranscribing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons
                                        name={isRecording ? 'stop' : 'mic'}
                                        size={20}
                                        color="#fff"
                                    />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSend}
                                disabled={!inputText.trim() || isLoading}
                                style={[
                                    styles.sendBtn,
                                    (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                                ]}
                            >
                                <Ionicons name="send" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
}

const getStyles = (colors: any, glassStyle: any) =>
    StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: colors.bgMid,
            borderTopLeftRadius: BorderRadius.xl,
            borderTopRightRadius: BorderRadius.xl,
            height: '80%',
            padding: Spacing.md,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
            marginBottom: Spacing.sm,
        },
        headerTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
        },
        modalTitle: {
            fontSize: FontSize.lg,
            fontWeight: '700',
            color: colors.text,
        },
        aiAvatarSmall: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        closeBtn: {
            padding: Spacing.xs,
        },
        listContent: {
            paddingBottom: Spacing.xl,
        },
        messageWrapper: {
            flexDirection: 'row',
            marginBottom: Spacing.md,
            maxWidth: '85%',
        },
        userWrapper: {
            alignSelf: 'flex-end',
        },
        aiWrapper: {
            alignSelf: 'flex-start',
            gap: Spacing.xs,
        },
        aiAvatar: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 4,
        },
        messageBubble: {
            padding: Spacing.md,
            borderRadius: BorderRadius.lg,
        },
        userBubble: {
            backgroundColor: colors.primary,
            borderBottomRightRadius: 2,
        },
        aiBubble: {
            backgroundColor: colors.glass,
            borderBottomLeftRadius: 2,
            borderWidth: 1,
            borderColor: colors.glassBorder,
        },
        messageText: {
            fontSize: FontSize.md,
            lineHeight: 22,
        },
        userText: {
            color: '#fff',
        },
        aiText: {
            color: colors.text,
        },
        timestamp: {
            fontSize: 10,
            marginTop: 4,
        },
        userTimestamp: {
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'right',
        },
        aiTimestamp: {
            color: colors.textMuted,
            textAlign: 'left',
        },
        loadingBubble: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            padding: Spacing.sm,
            marginBottom: Spacing.md,
        },
        loadingText: {
            fontSize: FontSize.sm,
            color: colors.textMuted,
            fontStyle: 'italic',
        },
        inputArea: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
            paddingTop: Spacing.sm,
            paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
        },
        input: {
            flex: 1,
            backgroundColor: colors.inputBg,
            borderRadius: BorderRadius.full,
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.sm,
            color: colors.text,
            fontSize: FontSize.md,
            maxHeight: 100,
        },
        micBtn: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.textMuted,
            justifyContent: 'center',
            alignItems: 'center',
        },
        micBtnActive: {
            backgroundColor: colors.danger,
        },
        sendBtn: {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
        },
        sendBtnDisabled: {
            backgroundColor: colors.divider,
            opacity: 0.5,
        },
    });

const getMarkdownStyles = (colors: any) => ({
    body: {
        color: colors.text,
        fontSize: FontSize.md,
        lineHeight: 22,
    },
    paragraph: {
        marginTop: 0,
        marginBottom: 8,
    },
    bullet_list: {
        marginVertical: 4,
    },
    ordered_list: {
        marginVertical: 4,
    },
    list_item: {
        marginVertical: 2,
    },
    strong: {
        fontWeight: '700' as const,
        color: colors.primaryLight,
    },
    code_inline: {
        backgroundColor: colors.inputBg,
        color: colors.primary,
        borderRadius: 4,
        paddingHorizontal: 4,
    },
});
