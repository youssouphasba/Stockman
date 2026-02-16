import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Vibration,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';

interface BatchScannerProps {
    onComplete: (codes: string[]) => void;
    onCancel: () => void;
    title?: string;
}

export default function BatchScanner({ onComplete, onCancel, title = "Scan par lot" }: BatchScannerProps) {
    const { colors, glassStyle } = useTheme();
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedItems, setScannedItems] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (!isScanning) return;

        // Add if not already in list (optional, but usually preferred for batch counts)
        if (!scannedItems.includes(data)) {
            setScannedItems(prev => [data, ...prev]);
            Vibration.vibrate(100);

            // Pause scanning briefly to avoid duplicates immediately
            setIsScanning(false);
            setTimeout(() => setIsScanning(true), 300);
        }
    };

    const removeScanned = (code: string) => {
        setScannedItems(prev => prev.filter(c => c !== code));
    };

    if (!permission) {
        return <View style={styles.centered}><Text>Demande d'autorisation de caméra...</Text></View>;
    }
    if (!permission.granted) {
        return (
            <View style={styles.centered}>
                <Text style={{ color: colors.text, marginBottom: 20 }}>Pas d'accès à la caméra</Text>
                <TouchableOpacity
                    onPress={requestPermission}
                    style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 8 }}
                >
                    <Text style={{ color: '#fff' }}>Autoriser la caméra</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.glass }]}>
                <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <TouchableOpacity
                    onPress={() => onComplete(scannedItems)}
                    style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                >
                    <Text style={styles.doneText}>Terminer ({scannedItems.length})</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.scannerContainer}>
                <CameraView
                    onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
                    style={StyleSheet.absoluteFillObject}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "code93", "itf14", "codabar", "aztec", "datamatrix", "pdf417"],
                    }}
                />
                <View style={styles.overlay}>
                    <View style={[styles.reticle, { borderColor: isScanning ? colors.primary : colors.textMuted }]} />
                    {!isScanning && (
                        <View style={styles.pausedMsg}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Scanné !</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={[styles.listContainer, { backgroundColor: colors.glass }]}>
                <View style={styles.listHeader}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>Articles scannés ({scannedItems.length})</Text>
                    <TouchableOpacity onPress={() => setScannedItems([])}>
                        <Text style={{ color: colors.danger, fontSize: 13 }}>Tout effacer</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={scannedItems}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <View style={[styles.item, { borderBottomColor: colors.divider }]}>
                            <Ionicons name="barcode-outline" size={20} color={colors.textMuted} />
                            <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
                            <TouchableOpacity onPress={() => removeScanned(item)}>
                                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            Visez un code-barres ou un tag RFID pour l'ajouter
                        </Text>
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: Spacing.md,
        zIndex: 10,
    },
    closeBtn: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    doneBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    doneText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    scannerContainer: {
        flex: 2,
        backgroundColor: '#000',
        position: 'relative',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reticle: {
        width: 250,
        height: 150,
        borderWidth: 2,
        borderRadius: 12,
    },
    pausedMsg: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        bottom: 40,
    },
    listContainer: {
        flex: 3,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        padding: Spacing.lg,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    itemText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 14,
    },
});
