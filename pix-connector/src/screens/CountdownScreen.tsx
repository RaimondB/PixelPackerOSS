import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import type { Backpack } from '../ble/Backpack';

interface Props {
  device: Backpack;
  onBack: () => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function CountdownScreen({ device, onBack }: Props) {
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const adjustMinutes = useCallback((delta: number) => {
    setMinutes(m => Math.max(0, Math.min(99, m + delta)));
  }, []);

  const adjustSeconds = useCallback((delta: number) => {
    setSeconds(s => Math.max(0, Math.min(59, s + delta)));
  }, []);

  const totalSeconds = minutes * 60 + seconds;

  const start = useCallback(async () => {
    if (totalSeconds === 0) {
      Alert.alert('Set a duration', 'Countdown must be longer than 0 seconds.');
      return;
    }
    setBusy(true);
    setStatus('Starting countdown…');
    try {
      await device.setCountdownMode(totalSeconds);
      setStatus(`Counting down from ${pad2(minutes)}:${pad2(seconds)}.`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  }, [device, totalSeconds, minutes, seconds]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Countdown</Text>
      </View>

      <View style={styles.pickerRow}>
        {/* Minutes */}
        <View style={styles.pickerCol}>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustMinutes(10)}>
            <Text style={styles.arrowText}>▲▲</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustMinutes(1)}>
            <Text style={styles.arrowText}>▲</Text>
          </TouchableOpacity>
          <Text style={styles.digitDisplay}>{pad2(minutes)}</Text>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustMinutes(-1)}>
            <Text style={styles.arrowText}>▼</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustMinutes(-10)}>
            <Text style={styles.arrowText}>▼▼</Text>
          </TouchableOpacity>
          <Text style={styles.unitLabel}>MIN</Text>
        </View>

        <Text style={styles.colon}>:</Text>

        {/* Seconds */}
        <View style={styles.pickerCol}>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustSeconds(10)}>
            <Text style={styles.arrowText}>▲▲</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustSeconds(1)}>
            <Text style={styles.arrowText}>▲</Text>
          </TouchableOpacity>
          <Text style={styles.digitDisplay}>{pad2(seconds)}</Text>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustSeconds(-1)}>
            <Text style={styles.arrowText}>▼</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => adjustSeconds(-10)}>
            <Text style={styles.arrowText}>▼▼</Text>
          </TouchableOpacity>
          <Text style={styles.unitLabel}>SEC</Text>
        </View>
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {busy && <ActivityIndicator color="#00d4ff" style={{ marginTop: 8 }} />}

      <TouchableOpacity
        style={[styles.startBtn, (busy || totalSeconds === 0) && styles.startBtnDisabled]}
        onPress={start}
        disabled={busy || totalSeconds === 0}
      >
        <Text style={styles.startText}>{busy ? 'Starting…' : 'Start Countdown'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  header:       { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  backBtn:      { paddingRight: 16, paddingVertical: 8 },
  backText:     { color: '#00d4ff', fontSize: 16 },
  title:        { color: '#fff', fontSize: 22, fontWeight: '700' },
  pickerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, flex: 1 },
  pickerCol:    { alignItems: 'center', gap: 4 },
  arrowBtn:     { padding: 10 },
  arrowText:    { color: '#00d4ff', fontSize: 18, fontWeight: '700' },
  digitDisplay: { color: '#fff', fontSize: 72, fontWeight: '200', fontVariant: ['tabular-nums'], width: 120, textAlign: 'center' },
  unitLabel:    { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
  colon:        { color: '#fff', fontSize: 72, fontWeight: '200', marginTop: -24 },
  status:       { color: '#00d4ff', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  startBtn:     { backgroundColor: '#00d4ff', borderRadius: 10, padding: 18, alignItems: 'center', marginBottom: 24 },
  startBtnDisabled: { opacity: 0.4 },
  startText:    { color: '#000', fontWeight: '800', fontSize: 16 },
});
