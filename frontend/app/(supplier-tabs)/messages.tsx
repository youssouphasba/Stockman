import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import ChatModal from '../../components/ChatModal';
import { LinearGradient } from 'expo-linear-gradient';

export default function SupplierMessagesScreen() {
    const { colors } = useTheme();

    // We want the chat modal to be permanently visible or automatically shown
    // Since it's a Modal, we can just render it with visible={true}
    // and handle the 'close' by potentially navigating away if needed, 
    // but in a tab it's better to just keep it open.

    return (
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.container}>
            <ChatModal
                visible={true}
                onClose={() => { }} // No-op as it's the main screen
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});
