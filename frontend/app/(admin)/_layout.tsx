import { Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AiSupportModal from '../../components/AiSupportModal';

export default function AdminLayout() {
    const { colors } = useTheme();
    const [aiVisible, setAiVisible] = useState(false);

    return (
        <>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.bgDark },
                }}
            >
                <Stack.Screen name="index" />
            </Stack>

            <TouchableOpacity
                onPress={() => setAiVisible(true)}
                style={[styles.fab, { backgroundColor: colors.primary }]}
            >
                <Ionicons name="sparkles" size={24} color="#fff" />
            </TouchableOpacity>

            <AiSupportModal visible={aiVisible} onClose={() => setAiVisible(false)} />
        </>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        zIndex: 100,
    }
});
