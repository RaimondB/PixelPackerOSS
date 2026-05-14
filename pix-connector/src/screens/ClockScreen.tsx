import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import type { Backpack } from '../ble/Backpack';

interface Props {
  device: Backpack;
  onBack: () => void;
}

function formatOffset(h: number): string {
  const sign = h >= 0 ? '+' : '-';
  const abs = Math.abs(h);
  const hh = Math.floor(abs);
  const mm = Math.round((abs - hh) * 60);
  return `UTC${sign}${hh}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`;
}

function localTimeForOffset(utcOffsetHours: number): string {
  const now = Math.floor(Date.now() / 1000) + Math.round(utcOffsetHours * 3600);
  const secsOfDay = ((now % 86400) + 86400) % 86400;
  const h = Math.floor(secsOfDay / 3600);
  const m = Math.floor((secsOfDay % 3600) / 60);
  const s = secsOfDay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Detect phone's UTC offset as a starting point (may be wrong on some Android/Hermes builds)
function detectedOffset(): number {
  return -new Date().getTimezoneOffset() / 60;
}

export function ClockScreen({ device, onBack }: Props) {
  const [offset, setOffset] = useState(() => detectedOffset());
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const adjust = useCallback((delta: number) => {
    setOffset(o => Math.max(-12, Math.min(14, parseFloat((o + delta).toFixed(1)))));
  }, []);

  const setClock = useCallback(async () => {
    setBusy(true);
    setStatus('Setting clock…');
    try {
      await device.setClockMode(offset);
      setStatus(`Clock set (${formatOffset(offset)}).`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  }, [device, offset]);

  const preview = localTimeForOffset(offset);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Clock</Text>
      </View>

      <View style={styles.previewBox}>
        <Text style={styles.previewTime}>{preview}</Text>
        <Text style={styles.previewLabel}>time that will be sent</Text>
      </View>

      <View style={styles.offsetRow}>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => adjust(-1)}>
          <Text style={styles.arrowText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.offsetLabel}>{formatOffset(offset)}</Text>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => adjust(1)}>
          <Text style={styles.arrowText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Adjust if the preview time doesn't match your local time</Text>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {busy && <ActivityIndicator color="#00d4ff" style={{ marginTop: 8 }} />}

      <TouchableOpacity
        style={[styles.setBtn, busy && styles.setBtnDisabled]}
        onPress={setClock}
        disabled={busy}
      >
        <Text style={styles.setText}>{busy ? 'Setting…' : 'Set Clock'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  header:       { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backBtn:      { paddingRight: 16, paddingVertical: 8 },
  backText:     { color: '#00d4ff', fontSize: 16 },
  title:        { color: '#fff', fontSize: 22, fontWeight: '700' },
  previewBox:   { alignItems: 'center', marginBottom: 40 },
  previewTime:  { color: '#fff', fontSize: 64, fontWeight: '200', fontVariant: ['tabular-nums'] },
  previewLabel: { color: '#555', fontSize: 12, marginTop: 4 },
  offsetRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 12 },
  arrowBtn:     { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  arrowText:    { color: '#00d4ff', fontSize: 28, fontWeight: '700' },
  offsetLabel:  { color: '#fff', fontSize: 28, fontWeight: '300', width: 120, textAlign: 'center' },
  hint:         { color: '#555', fontSize: 12, textAlign: 'center', marginBottom: 32 },
  status:       { color: '#00d4ff', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  setBtn:       { backgroundColor: '#00d4ff', borderRadius: 10, padding: 18, alignItems: 'center', marginBottom: 24 },
  setBtnDisabled: { opacity: 0.4 },
  setText:      { color: '#000', fontWeight: '800', fontSize: 16 },
});
