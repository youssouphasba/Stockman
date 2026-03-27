import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Modal, Platform, TextInput } from 'react-native';
import { admin, CollectionInfo, CollectionData } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function DataExplorer() {
    const { t } = useTranslation();
    const { colors, isDark } = useTheme();

    const [collections, setCollections] = useState<CollectionInfo[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [collectionData, setCollectionData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const LIMIT = 20;
    const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => { loadCollections(); }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (selectedCollection) loadCollectionData(selectedCollection, 0);
    }, [selectedCollection, debouncedSearch]);

    const loadCollections = async () => {
        try {
            const data = await admin.getCollections();
            setCollections(data.sort((a, b) => b.count - a.count));
        } catch (error) {
            console.error("Failed to load collections:", error);
        } finally { setLoading(false); }
    };

    const loadCollectionData = async (name: string, skip: number) => {
        setLoading(true);
        try {
            const result = await admin.getCollectionData(name, skip, LIMIT, debouncedSearch);
            setCollectionData(result.data);
            setTotal(result.total);
            setPage(skip / LIMIT);
        } catch (error) {
            console.error("Failed to load collection data:", error);
        } finally { setLoading(false); }
    };

    const renderValue = (val: any) => {
        if (val === null || val === undefined) return '—';
        if (typeof val === 'object') {
            const s = JSON.stringify(val);
            return s.length > 40 ? s.substring(0, 40) + '…' : s;
        }
        return String(val);
    };

    const keys = collectionData.length > 0 ? Object.keys(collectionData[0]).slice(0, 6) : [];
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    const isMobile = Platform.OS !== 'web';

    const collectionIcons: Record<string, string> = {
        users: 'people', products: 'cube', orders: 'receipt', customers: 'person',
        stores: 'business', activity_logs: 'list', support_tickets: 'help-buoy',
        disputes: 'warning', admin_messages: 'megaphone', security_events: 'shield',
        push_tokens: 'notifications', sales: 'cash', suppliers: 'car',
    };

    const headerGradient = isDark ? ['#1E1B4B', '#312E81', '#1E1B4B'] : [colors.bgLight, colors.bgMid, colors.bgDark];
    const headerSurface = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)';
    const headerSubtle = isDark ? 'rgba(255,255,255,0.5)' : colors.textMuted;
    const cardBg = isDark ? 'rgba(255,255,255,0.06)' : colors.card;
    const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : colors.glassBorder;
    const tableHeaderBg = isDark ? '#1E1B4B' : colors.secondary;
    const rowBgA = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.82)';
    const rowBgB = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(241,245,249,0.96)';
    const modalSurface = isDark ? '#1E1B4B' : colors.card;
    const modalInner = isDark ? '#0F0D23' : colors.inputBg;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <LinearGradient colors={headerGradient as [string, string, string]} style={{ paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: headerSurface, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="arrow-back" size={18} color={colors.text} />
                        </TouchableOpacity>
                        <View>
                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>📊 {t('admin.data_explorer.title')}</Text>
                            <Text style={{ color: headerSubtle, fontSize: 12, marginTop: 2 }}>
                                {collections.length} collections • {selectedCollection || t('admin.data_explorer.select_hint')}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {/* Collection Cards */}
                {!selectedCollection && (
                    <>
                        <Text style={{ color: '#A5B4FC', fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {t('admin.data_explorer.select_collection')}
                        </Text>
                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                        ) : (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {collections.map((col) => (
                                    <TouchableOpacity
                                        key={col.name}
                                        onPress={() => setSelectedCollection(col.name)}
                                        style={{
                                            backgroundColor: cardBg,
                                            borderWidth: 1, borderColor: cardBorder,
                                            borderRadius: 12, padding: 14,
                                            width: isMobile ? '48%' : 180,
                                            gap: 6,
                                        }}
                                    >
                                        <Ionicons name={(collectionIcons[col.name] || 'folder') as any} size={22} color={colors.primary} />
                                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{col.name}</Text>
                                        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 18 }}>{col.count}</Text>
                                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{t('admin.data_explorer.documents')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Data Table */}
                {selectedCollection && (
                    <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
                            <TouchableOpacity onPress={() => { setSelectedCollection(null); setCollectionData([]); setSearchQuery(''); }}
                                style={{ backgroundColor: colors.primary + '18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="arrow-back" size={14} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{t('common.back')}</Text>
                            </TouchableOpacity>
                            <Ionicons name={(collectionIcons[selectedCollection] || 'folder') as any} size={20} color={colors.primary} />
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{selectedCollection}</Text>
                            <Text style={{ color: colors.primary, fontSize: 13 }}>({total} docs)</Text>
                        </View>

                        {/* Search Bar */}
                        <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.glassBorder }}>
                                <Ionicons name="search" size={20} color={colors.textMuted} />
                                <TextInput
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholder={t('admin.data_explorer.search_placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                    style={{ flex: 1, padding: 10, color: colors.text }}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                        ) : collectionData.length === 0 ? (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
                                <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 14 }}>Collection vide</Text>
                            </View>
                        ) : (
                            <>
                                {/* Scrollable table */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                                    <View>
                                        {/* Table Header */}
                                        <View style={{ flexDirection: 'row', backgroundColor: tableHeaderBg, borderRadius: 8, marginBottom: 2 }}>
                                            {keys.map(k => (
                                                <View key={k} style={{ width: 150, padding: 10 }}>
                                                    <Text style={{ color: isDark ? '#A5B4FC' : '#E2E8F0', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' }}>{k}</Text>
                                                </View>
                                            ))}
                                            <View style={{ width: 60, padding: 10, alignItems: 'center' }}>
                                                <Text style={{ color: isDark ? '#A5B4FC' : '#E2E8F0', fontWeight: '700', fontSize: 12 }}>👁️</Text>
                                            </View>
                                        </View>

                                        {/* Table Rows */}
                                        {collectionData.map((item, idx) => (
                                            <TouchableOpacity key={idx} onPress={() => setSelectedDocument(item)}
                                                style={{ flexDirection: 'row', backgroundColor: idx % 2 === 0 ? rowBgA : rowBgB, borderRadius: 4 }}>
                                                {keys.map(k => (
                                                    <View key={k} style={{ width: 150, padding: 10 }}>
                                                        <Text style={{ color: colors.text, fontSize: 12 }} numberOfLines={1}>{renderValue(item[k])}</Text>
                                                    </View>
                                                ))}
                                                <View style={{ width: 60, padding: 10, alignItems: 'center' }}>
                                                    <Ionicons name="eye-outline" size={16} color={colors.primary} />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>

                                {/* Pagination */}
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 16 }}>
                                    <TouchableOpacity disabled={page === 0} onPress={() => loadCollectionData(selectedCollection, (page - 1) * LIMIT)}
                                        style={{ backgroundColor: page === 0 ? colors.inputBg : colors.primary + '20', padding: 8, borderRadius: 8 }}>
                                        <Ionicons name="chevron-back" size={20} color={page === 0 ? colors.textMuted : colors.primary} />
                                    </TouchableOpacity>
                                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>Page {page + 1} / {totalPages}</Text>
                                    <TouchableOpacity disabled={(page + 1) * LIMIT >= total} onPress={() => loadCollectionData(selectedCollection, (page + 1) * LIMIT)}
                                        style={{ backgroundColor: (page + 1) * LIMIT >= total ? colors.inputBg : colors.primary + '20', padding: 8, borderRadius: 8 }}>
                                        <Ionicons name="chevron-forward" size={20} color={(page + 1) * LIMIT >= total ? colors.textMuted : colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </>
                )}
            </ScrollView>

            {/* JSON Viewer Modal */}
            {!!selectedDocument && <Modal visible={!!selectedDocument} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: '90%', maxWidth: 600, maxHeight: '85%', backgroundColor: modalSurface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.glassBorder }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>📄 Document JSON</Text>
                            <TouchableOpacity onPress={() => setSelectedDocument(null)} style={{ backgroundColor: '#EF444422', padding: 6, borderRadius: 8 }}>
                                <Ionicons name="close" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ backgroundColor: modalInner, borderRadius: 10, padding: 14 }}>
                            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: colors.text, fontSize: 12, lineHeight: 18 }}>
                                {JSON.stringify(selectedDocument, null, 2)}
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>}
        </View>
    );
}
