import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize } from '../constants/theme';
import { useNetwork } from '../hooks/useNetwork';

export default function OfflineBanner() {
    const { isConnected } = useNetwork();
    const insets = useSafeAreaInsets();

    if (isConnected !== false) return null;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Text style={styles.text}>Mode hors ligne</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.danger,
        paddingHorizontal: 16,
        paddingBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    text: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
});
