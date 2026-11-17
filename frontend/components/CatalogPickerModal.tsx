import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { catalog as catalogApi } from '../services/api';

const PAGE_SIZE = 50;

type CatalogEntry = {
    catalog_id: string;
    display_name: string;
    category?: string;
    unit?: string;
    image_url?: string | null;
    in_store?: boolean;
};

type Props = {
    sector: string;
    countryCode?: string;
    onClose: () => void;
    onImported: (count: number) => void;
};

// Choix des produits du catalogue de son secteur : rien n'est ajouté sans sélection.
// À afficher en rendu conditionnel ({show && <CatalogPickerModal />}) pour iOS.
export default function CatalogPickerModal({ sector, countryCode, onClose, onImported }: Props) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<CatalogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const requestId = useRef(0);

    const load = useCallback(async (term: string, skip: number) => {
        const current = ++requestId.current;
        if (skip === 0) setLoading(true); else setLoadingMore(true);
        setError('');
        try {
            const result = await catalogApi.browse(sector, countryCode, term || undefined, skip, PAGE_SIZE);
            if (current !== requestId.current) return;
            const products = (result.products || []) as CatalogEntry[];
            setItems(previous => (skip === 0 ? products : [...previous, ...products]));
            setTotal(result.total || 0);
        } catch (err: any) {
            if (current === requestId.current) setError(err?.message || t('products.catalog_picker.load_error'));
        } finally {
            if (current === requestId.current) { setLoading(false); setLoadingMore(false); }
        }
    }, [sector, countryCode, t]);

    useEffect(() => {
        const timer = setTimeout(() => { void load(search.trim(), 0); }, 300);
        return () => clearTimeout(timer);
    }, [search, load]);

    const selectable = items.filter(item => !item.in_store);
    const allVisibleSelected = selectable.length > 0 && selectable.every(item => selected.has(item.catalog_id));

    const toggle = (id: string) => setSelected(previous => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const toggleVisible = () => setSelected(previous => {
        const next = new Set(previous);
        if (allVisibleSelected) selectable.forEach(item => next.delete(item.catalog_id));
        else selectable.forEach(item => next.add(item.catalog_id));
        return next;
    });

    const submit = async () => {
        if (!selected.size) return;
        setImporting(true);
        setError('');
        try {
            const result = await catalogApi.import(Array.from(selected));
            onImported(result.imported || 0);
        } catch (err: any) {
            setError(err?.message || t('products.catalog_import_error'));
        } finally {
            setImporting(false);
        }
    };

    const renderItem = ({ item }: { item: CatalogEntry }) => {
        const checked = selected.has(item.catalog_id);
        const disabled = Boolean(item.in_store);
        return (
            <TouchableOpacity
                style={[styles.row, disabled && styles.rowDisabled]}
                onPress={() => !disabled && toggle(item.catalog_id)}
                disabled={disabled}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled }}
            >
                <Ionicons
                    name={disabled ? 'checkmark-done-outline' : checked ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={disabled ? colors.textMuted : checked ? colors.primary : colors.textSecondary}
                />
                <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, disabled && { color: colors.textMuted }]} numberOfLines={2}>{item.display_name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                        {disabled
                            ? t('products.catalog_picker.already_in_store')
                            : [item.category, item.unit].filter(Boolean).join(' · ') || ' '}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}>
            <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? Spacing.md : insets.top + Spacing.sm }]}>
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{t('products.catalog_picker.title')}</Text>
                        <Text style={styles.subtitle}>{t('products.catalog_picker.subtitle')}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.cancel')} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search" size={18} color={colors.textMuted} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t('products.catalog_picker.search_placeholder')}
                        placeholderTextColor={colors.textMuted}
                        style={styles.searchInput}
                        autoCorrect={false}
                    />
                </View>

                <View style={styles.toolbar}>
                    <Text style={styles.count}>{t('products.catalog_picker.count', { count: total })}</Text>
                    {selectable.length > 0 && (
                        <TouchableOpacity onPress={toggleVisible}>
                            <Text style={styles.link}>{allVisibleSelected ? t('products.catalog_picker.unselect_visible') : t('products.catalog_picker.select_visible')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <ActivityIndicator style={{ marginTop: Spacing.xl }} color={colors.primary} />
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={item => item.catalog_id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: Spacing.lg }}
                        onEndReachedThreshold={0.4}
                        onEndReached={() => { if (!loadingMore && items.length < total) void load(search.trim(), items.length); }}
                        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: Spacing.md }} color={colors.primary} /> : null}
                        ListEmptyComponent={<Text style={styles.empty}>{error || t('products.catalog_picker.empty')}</Text>}
                        keyboardShouldPersistTaps="handled"
                    />
                )}

                <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
                    {error && items.length ? <Text style={styles.error}>{error}</Text> : null}
                    <Text style={styles.hint}>{t('products.catalog_picker.hint')}</Text>
                    <TouchableOpacity
                        style={[styles.submit, (!selected.size || importing) && { opacity: 0.5 }]}
                        onPress={() => void submit()}
                        disabled={!selected.size || importing}
                    >
                        {importing
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.submitText}>{t('products.catalog_picker.submit', { count: selected.size })}</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark || colors.background },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    title: { fontSize: FontSize.lg, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },
    closeButton: { padding: 4 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md,
        paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.glassBorder || colors.border,
        backgroundColor: colors.glass || colors.card,
    },
    searchInput: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: FontSize.md },
    toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    count: { color: colors.textSecondary, fontSize: FontSize.sm },
    link: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.glassBorder || colors.border,
    },
    rowDisabled: { opacity: 0.6 },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '600' },
    rowMeta: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
    footer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder || colors.border, gap: Spacing.xs },
    hint: { color: colors.textMuted, fontSize: FontSize.xs, lineHeight: 17 },
    error: { color: colors.danger, fontSize: FontSize.sm },
    submit: { backgroundColor: colors.primary, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.xs },
    submitText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
});
