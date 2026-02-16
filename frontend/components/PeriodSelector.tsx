import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';

export type Period = number | 'custom';

interface PeriodSelectorProps {
    selectedPeriod: Period;
    onSelectPeriod: (period: Period) => void;
    startDate?: string | Date;
    endDate?: string | Date;
    onSelectCustomDate?: (start: Date, end: Date) => void;
    onApplyCustomDate?: (start: string, end: string) => void;
}

export default function PeriodSelector({
    selectedPeriod,
    onSelectPeriod,
    startDate,
    endDate,
    onApplyCustomDate
}: PeriodSelectorProps) {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const PERIODS = [
        { label: t('common.periods.7d'), value: 7 },
        { label: t('common.periods.30d'), value: 30 },
        { label: t('common.periods.90d'), value: 90 },
        { label: t('common.periods.1y'), value: 365 },
    ];

    const [localStart, setLocalStart] = React.useState(startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate || '');
    const [localEnd, setLocalEnd] = React.useState(endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate || '');

    // Update local state if props change
    React.useEffect(() => {
        setLocalStart(startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate || '');
    }, [startDate]);

    React.useEffect(() => {
        setLocalEnd(endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate || '');
    }, [endDate]);

    const handleApply = () => {
        if (onApplyCustomDate) {
            onApplyCustomDate(localStart, localEnd);
        }
    };

    const styles = StyleSheet.create({
        periodRow: {
            flexDirection: 'row',
            marginBottom: Spacing.sm,
        },
        periodBtn: {
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: BorderRadius.full,
            backgroundColor: colors.glass,
            marginRight: Spacing.sm,
            borderWidth: 1,
            borderColor: colors.divider,
        },
        periodBtnActive: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
        },
        periodBtnText: {
            fontSize: FontSize.sm,
            color: colors.text,
            fontWeight: '500',
        },
        periodBtnTextActive: {
            color: '#fff',
        },
        customDateRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.glass,
            padding: Spacing.sm,
            borderRadius: BorderRadius.md,
            gap: Spacing.sm,
            marginTop: Spacing.xs,
        },
        dateInput: {
            flex: 1,
            backgroundColor: colors.bgDark,
            borderWidth: 1,
            borderColor: colors.divider,
            borderRadius: BorderRadius.sm,
            padding: 8,
            color: colors.text,
            fontSize: FontSize.sm,
        },
        applyBtn: {
            backgroundColor: colors.primary,
            padding: 8,
            borderRadius: BorderRadius.sm,
            alignItems: 'center',
            justifyContent: 'center',
        },
    });

    return (
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodRow}>
                {PERIODS.map(p => (
                    <TouchableOpacity
                        key={p.value}
                        style={[styles.periodBtn, selectedPeriod === p.value && styles.periodBtnActive]}
                        onPress={() => onSelectPeriod(p.value)}
                    >
                        <Text style={[styles.periodBtnText, selectedPeriod === p.value && styles.periodBtnTextActive]}>
                            {p.label}
                        </Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity
                    style={[styles.periodBtn, selectedPeriod === 'custom' && styles.periodBtnActive]}
                    onPress={() => onSelectPeriod('custom')}
                >
                    <Text style={[styles.periodBtnText, selectedPeriod === 'custom' && styles.periodBtnTextActive]}>
                        {t('common.periods.custom')}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {selectedPeriod === 'custom' && (
                <View style={styles.customDateRow}>
                    <TextInput
                        style={styles.dateInput}
                        placeholder="AAAA-MM-JJ"
                        placeholderTextColor={colors.textSecondary}
                        value={localStart}
                        onChangeText={setLocalStart}
                    />
                    <Text style={{ color: colors.textSecondary }}>{t('common.periods.to')}</Text>
                    <TextInput
                        style={styles.dateInput}
                        placeholder="AAAA-MM-JJ"
                        placeholderTextColor={colors.textSecondary}
                        value={localEnd}
                        onChangeText={setLocalEnd}
                    />
                    <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
