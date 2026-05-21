import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const PRODUCT_BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14'] as const;

type Props = {
    visible: boolean;
    onClose: () => void;
    onScanned: (data: string) => void;
    continuous?: boolean;
    onToggleContinuous?: () => void;
};

export default function BarcodeScanner({ visible, onClose, onScanned, continuous, onToggleContinuous }: Props) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [permissionRequested, setPermissionRequested] = useState(false);
    const [permissionLoading, setPermissionLoading] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const styles = createStyles(colors);
    const hasPermission = permission?.granted || permissionGranted;

    useEffect(() => {
        if (permission?.granted) {
            setPermissionGranted(true);
        }
    }, [permission?.granted]);

    useEffect(() => {
        if (!visible || hasPermission || permissionRequested || permissionLoading) {
            return;
        }

        setPermissionRequested(true);
        setPermissionLoading(true);
        requestPermission().then((result) => {
            if (result.granted) {
                setPermissionGranted(true);
                return;
            }

            Alert.alert(
                t('common.error', 'Erreur'),
                t('scanner.permission_text', "L'accès à la caméra est nécessaire pour scanner les codes-barres."),
                [{ text: t('common.ok', 'OK'), onPress: onClose }]
            );
        }).finally(() => {
            setPermissionLoading(false);
        });
    }, [visible, hasPermission, permissionRequested, permissionLoading, requestPermission, t, onClose]);

    useEffect(() => {
        if (visible) {
            setScanned(false);
            return;
        }

        setPermissionRequested(false);
        setPermissionLoading(false);
    }, [visible]);

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        if (scanned && !continuous) return;

        onScanned(data);

        if (!continuous) {
            setScanned(true);
            onClose();
            return;
        }

        setScanned(true);
        setTimeout(() => setScanned(false), 1200);
    };

    if (!visible) {
        return null;
    }

    if (!permission || permissionLoading) {
        return (
            <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
                <View style={styles.permissionContainer}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            </Modal>
        );
    }

    if (!hasPermission) {
        return (
            <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
                <View style={styles.permissionContainer}>
                    <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
                    <Text style={styles.permissionText}>
                        {t('scanner.permission_text', "L'accès à la caméra est nécessaire pour scanner les codes-barres.")}
                    </Text>
                    <TouchableOpacity
                        style={styles.permissionButton}
                        onPress={() => {
                            setPermissionLoading(true);
                            requestPermission()
                                .then((result) => setPermissionGranted(result.granted))
                                .finally(() => setPermissionLoading(false));
                        }}
                    >
                        <Text style={styles.permissionButtonText}>{t('scanner.allow_camera', 'Autoriser la caméra')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>{t('common.cancel', 'Annuler')}</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: PRODUCT_BARCODE_TYPES as any,
                    }}
                >
                    <View style={styles.overlay}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.backButton}>
                                <Ionicons name="close-circle" size={40} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.headerText}>{t('scanner.title')}</Text>
                        </View>

                        <View style={styles.scanTarget}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                        </View>

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.continuousToggle, continuous && { backgroundColor: colors.primary }]}
                                onPress={onToggleContinuous}
                            >
                                <Ionicons name={continuous ? 'infinite' : 'stop-circle-outline'} size={20} color="#fff" />
                                <Text style={styles.footerText}>{continuous ? t('scanner.continuous_on') : t('scanner.continuous_off')}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.footerText, { marginTop: 8, opacity: 0.8 }]}>{t('scanner.aim')}</Text>
                        </View>
                    </View>
                </CameraView>
            </View>
        </Modal>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        backgroundColor: colors.bgDark,
    },
    permissionText: {
        color: colors.text,
        fontSize: FontSize.md,
        textAlign: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.xl,
    },
    permissionButton: {
        backgroundColor: colors.primary,
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
        color: colors.textMuted,
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
        borderColor: colors.primary,
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
    continuousToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.sm,
    },
    footer: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
    },
    footerText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
});
