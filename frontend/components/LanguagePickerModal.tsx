import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Language {
    code: string;
    name: string;
    badge: string;
}

const LANGUAGES: Language[] = [
    { code: 'fr', name: 'Français', badge: 'FR' },
    { code: 'en', name: 'English', badge: 'EN' },
    { code: 'wo', name: 'Wolof', badge: 'WO' },
    { code: 'ff', name: 'Pulaar', badge: 'FF' },
    { code: 'es', name: 'Español', badge: 'ES' },
    { code: 'pt', name: 'Português', badge: 'PT' },
    { code: 'it', name: 'Italiano', badge: 'IT' },
    { code: 'de', name: 'Deutsch', badge: 'DE' },
    { code: 'pl', name: 'Polski', badge: 'PL' },
    { code: 'ro', name: 'Română', badge: 'RO' },
    { code: 'tr', name: 'Türkçe', badge: 'TR' },
    { code: 'ar', name: 'Arabe', badge: 'AR' },
    { code: 'ru', name: 'Russe', badge: 'RU' },
    { code: 'zh', name: 'Chinois', badge: 'ZH' },
    { code: 'hi', name: 'Hindi', badge: 'HI' },
];

interface LanguagePickerModalProps {
    visible: boolean;
    onClose: () => void;
}

const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({ visible, onClose }) => {
    const { i18n, t } = useTranslation();
    const { colors } = useTheme();

    const currentLanguage = i18n.language.split('-')[0]; // Handle cases like 'en-US'

    const changeLanguage = async (code: string) => {
        try {
            await i18n.changeLanguage(code);
            await AsyncStorage.setItem('user-language', code);
            await AsyncStorage.setItem('user-language-manual', 'true');
        } catch (error) {
            console.error('Error saving manual language:', error);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: colors.bgMid }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            {t('common.language_choice') || 'Choisir la langue'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.option,
                                    currentLanguage === lang.code && { backgroundColor: colors.primary + '20' },
                                    { borderBottomColor: colors.divider }
                                ]}
                                onPress={() => changeLanguage(lang.code)}
                            >
                                <View style={styles.optionLeft}>
                                    <View style={[styles.badge, { borderColor: colors.divider, backgroundColor: colors.card }]}>
                                        <Text style={[styles.badgeText, { color: colors.text }]}>{lang.badge}</Text>
                                    </View>
                                    <Text style={[styles.langName, { color: colors.text }]}>{lang.name}</Text>
                                </View>
                                {currentLanguage === lang.code && (
                                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        paddingTop: Spacing.lg,
        maxHeight: SCREEN_HEIGHT * 0.7,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 5,
    },
    scrollContent: {
        paddingBottom: Spacing.xl,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    badge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    langName: {
        fontSize: FontSize.md,
        fontWeight: '500',
    },
});

export default LanguagePickerModal;
