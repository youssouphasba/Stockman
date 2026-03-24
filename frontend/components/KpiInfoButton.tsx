import React, { useState } from 'react';
import { TouchableOpacity, Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  info: string;
  color?: string;
  size?: number;
};

export default function KpiInfoButton({ info, color = 'rgba(255,255,255,0.5)', size = 14 }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} hitSlop={8} style={styles.btn}>
        <Ionicons name="information-circle-outline" size={size} color={color} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.tooltip}>
            <Ionicons name="information-circle" size={22} color="#3B82F6" style={{ marginBottom: 6 }} />
            <Text style={styles.text}>{info}</Text>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.close}>
              <Text style={styles.closeText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { position: 'absolute', top: 6, right: 6, zIndex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  tooltip: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20, maxWidth: 320, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  text: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  close: { marginTop: 14, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8, backgroundColor: '#3B82F6' },
  closeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
