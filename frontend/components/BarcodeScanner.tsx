import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/theme';

type Props = {
    visible: boolean;
    onClose: () => void;
    onScanned: (data: string) => void;
};

export default function BarcodeScanner({ visible, onClose, onScanned }: Props) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (visible && !permission?.granted) {
            requestPermission();
        }
    }, [visible, permission]);

    useEffect(() => {
        if (visible) {
            setScanned(false);
        }
    }, [visible]);

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        onScanned(data);
        onClose();
    };

    if (!permission) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {!permission.granted ? (
                    <View style={styles.permissionContainer}>
                        <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
                        <Text style={styles.permissionText}>L'accès à la caméra est nécessaire pour scanner les codes-barres.</Text>
                        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                            <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "code93", "itf14", "codabar", "aztec", "datamatrix", "pdf417"],
                        }}
                    >
                        <View style={styles.overlay}>
                            <View style={styles.header}>
                                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                                    <Ionicons name="close-circle" size={40} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.headerText}>Scanner un Produit</Text>
                            </View>

                            <View style={styles.scanTarget}>
                                <View style={[styles.corner, styles.topLeft]} />
                                <View style={[styles.corner, styles.topRight]} />
                                <View style={[styles.corner, styles.bottomLeft]} />
                                <View style={[styles.corner, styles.bottomRight]} />
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Placez le code-barres dans le cadre</Text>
                            </View>
                        </View>
                    </CameraView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.bgDark,
    },
    permissionText: {
        color: Colors.text,
        fontSize: FontSize.md,
        textAlign: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.xl,
    },
    permissionButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    closeButton: {
        padding: Spacing.md,
    },
    closeButtonText: {
        color: Colors.textMuted,
        fontSize: FontSize.md,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
    },
    header: {
        alignItems: 'center',
    },
    headerText: {
        color: '#fff',
        fontSize: FontSize.lg,
        fontWeight: '700',
        marginTop: Spacing.md,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    backButton: {
        padding: 5,
    },
    scanTarget: {
        width: 280,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: Colors.primary,
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    footer: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    footerText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
});
