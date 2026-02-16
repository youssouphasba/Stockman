import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { useSync } from '../contexts/SyncContext';

export default function OfflineBanner() {
    const { isOnline, syncStatus, pendingCount, lastSyncLabel, processQueue } = useSync();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(-100)).current;

    const showBanner = !isOnline || syncStatus === 'syncing' || syncStatus === 'synced';

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: showBanner ? 0 : -100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [showBanner]);

    if (!showBanner) return null;

    const isSyncing = syncStatus === 'syncing';
    const isSynced = syncStatus === 'synced';

    const bgColor = isSynced
        ? Colors.success
        : isSyncing
            ? Colors.warning
            : Colors.danger;

    const icon = isSynced
        ? 'checkmark-circle'
        : isSyncing
            ? 'sync'
            : 'cloud-offline-outline';

    const message = isSynced
        ? 'Synchronisation terminée'
        : isSyncing
            ? 'Synchronisation en cours...'
            : pendingCount > 0
                ? `Hors ligne — ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente`
                : 'Mode hors ligne';

    return (
        <Animated.View
            style={[
                styles.container,
                { paddingTop: insets.top + 4, backgroundColor: bgColor, transform: [{ translateY: slideAnim }] },
            ]}
        >
            <View style={styles.content}>
                {isSyncing ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Ionicons name={icon as any} size={16} color="#fff" />
                )}
                <Text style={styles.text}>{message}</Text>
                {!isOnline && (
                    <Text style={styles.subtext}>{lastSyncLabel}</Text>
                )}
                {isOnline && pendingCount > 0 && !isSyncing && (
                    <TouchableOpacity onPress={processQueue} style={styles.syncBtn}>
                        <Ionicons name="sync" size={14} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        zIndex: 9999,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    text: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    subtext: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: FontSize.xs,
    },
    syncBtn: {
        marginLeft: Spacing.xs,
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
});
