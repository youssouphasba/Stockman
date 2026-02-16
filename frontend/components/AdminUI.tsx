import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============ FILTER BAR ============
export function FilterBar({ filters, active, onSelect, colors }: {
    filters: { id: string; label: string }[]; active: string; onSelect: (id: string) => void; colors: any;
}) {
    return (
        <View style={s.filterRow}>
            {filters.map(f => (
                <TouchableOpacity key={f.id} onPress={() => onSelect(f.id)}
                    style={[s.filterChip, active === f.id && { backgroundColor: colors.primary }]}>
                    <Text style={[s.filterText, { color: active === f.id ? '#fff' : colors.textSecondary }]}>{f.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ============ SEARCH BAR ============
export function SearchBar({ value, onChangeText, placeholder, colors }: {
    value: string; onChangeText: (t: string) => void; placeholder: string; colors: any;
}) {
    return (
        <View style={[s.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
                placeholderTextColor={colors.textMuted} style={[s.searchInput, { color: colors.text }]} />
        </View>
    );
}

// ============ STAT CARD ============
export function StatCard({ label, value, icon, color, colors }: {
    label: string; value: string | number; icon: string; color: string; colors: any;
}) {
    return (
        <View style={[s.statCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <View style={[s.statIcon, { backgroundColor: color + '22' }]}>
                <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
    );
}

// ============ STATUS BADGE ============
export function Badge({ label, color }: { label: string; color: string }) {
    return (
        <View style={[s.badge, { backgroundColor: color + '22' }]}>
            <Text style={[s.badgeText, { color }]}>{label}</Text>
        </View>
    );
}

// ============ SECTION HEADER ============
export function SectionHeader({ title, count, colors }: { title: string; count?: number; colors: any }) {
    return (
        <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
            {count !== undefined && <Badge label={`${count}`} color="#7C3AED" />}
        </View>
    );
}

// ============ CARD ============
export function Card({ children, colors, style }: { children: React.ReactNode; colors: any; style?: any }) {
    return (
        <View style={[s.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }, style]}>
            {children}
        </View>
    );
}

// ============ ACTION BUTTON ============
export function ActionButton({ label, icon, color, onPress }: {
    label: string; icon: string; color: string; onPress: () => void;
}) {
    return (
        <TouchableOpacity onPress={onPress} style={[s.actionBtn, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon as any} size={18} color={color} />
            <Text style={[s.actionLabel, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

// ============ EMPTY STATE ============
export function EmptyState({ icon, message, colors }: { icon: string; message: string; colors: any }) {
    return (
        <View style={s.empty}>
            <Ionicons name={icon as any} size={48} color={colors.textMuted} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>{message}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
    filterText: { fontSize: 12, fontWeight: '600' },
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, gap: 8 },
    searchInput: { flex: 1, fontSize: 14 },
    statCard: { flex: 1, minWidth: 140, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
    statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, textAlign: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    actionLabel: { fontSize: 12, fontWeight: '600' },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { fontSize: 14 },
});
