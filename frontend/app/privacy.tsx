import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { system } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function PrivacyScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { colors } = useTheme();
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPrivacy();
    }, []);

    const fetchPrivacy = async () => {
        try {
            setLoading(true);
            const res = await system.getPrivacy();
            setContent(res.content);
        } catch (err) {
            setError(t('legal.error_loading_privacy'));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]}>
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('legal.privacy_title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
                ) : error ? (
                    <View style={styles.center}>
                        <Text style={{ color: '#EF4444' }}>{error}</Text>
                        <TouchableOpacity onPress={fetchPrivacy} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                            <Text style={{ color: '#fff' }}>{t('legal.retry_btn')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Markdown
                        style={{
                            body: { color: colors.text, fontSize: 16 },
                            heading1: { color: colors.primary, marginVertical: 10 },
                            heading2: { color: colors.text, marginVertical: 8, fontSize: 20, fontWeight: 'bold' },
                            heading3: { color: colors.text, marginVertical: 6, fontSize: 18, fontWeight: '600' },
                            paragraph: { marginBottom: 10, lineHeight: 22 },
                            strong: { fontWeight: 'bold' },
                            hr: { backgroundColor: colors.divider, height: 1, marginVertical: 15 },
                        }}
                    >
                        {content}
                    </Markdown>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    },
    retryButton: {
        marginTop: 15,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
});
