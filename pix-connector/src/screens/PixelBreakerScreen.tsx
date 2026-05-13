import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import type { Backpack } from '../ble/Backpack';
import {
  MODE_PIXEL_BREAKER,
  GAME_INPUT_LEFT,
  GAME_INPUT_RIGHT,
  GAME_INPUT_UP,
  GAME_INPUT_DOWN,
  GAME_INPUT_FIRE,
} from '../ble/constants';

interface Props {
  device: Backpack;
  onBack: () => void;
}

export function PixelBreakerScreen({ device, onBack }: Props) {
  const [status, setStatus] = useState('');
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    device.setRenderMode([MODE_PIXEL_BREAKER]).catch(() => {});
    return () => { stopRepeat(); };
  }, [device]);

  const stopRepeat = useCallback(() => {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }, []);

  const sendInput = useCallback(async (value: number) => {
    try {
      await device.sendInput(value);
      setStatus('');
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      Alert.alert('Error', e.message);
    }
  }, [device]);

  // Hold a button: send input repeatedly every 150ms
  const startHold = useCallback((value: number) => {
    stopRepeat();
    sendInput(value);
    repeatRef.current = setInterval(() => sendInput(value), 150);
  }, [sendInput, stopRepeat]);

  const endHold = useCallback(() => {
    stopRepeat();
  }, [stopRepeat]);

  function DpadBtn({
    label, value, style,
  }: { label: string; value: number; style?: object }) {
    return (
      <TouchableOpacity
        style={[styles.dpadBtn, style]}
        onPressIn={() => startHold(value)}
        onPressOut={endHold}
        activeOpacity={0.6}
      >
        <Text style={styles.dpadLabel}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pixel Breaker</Text>
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <View style={styles.gamepad}>
        {/* D-pad */}
        <View style={styles.dpad}>
          <View style={styles.dpadRow}>
            <View style={styles.dpadEmpty} />
            <DpadBtn label="▲" value={GAME_INPUT_UP} />
            <View style={styles.dpadEmpty} />
          </View>
          <View style={styles.dpadRow}>
            <DpadBtn label="◄" value={GAME_INPUT_LEFT} />
            <View style={styles.dpadCenter} />
            <DpadBtn label="►" value={GAME_INPUT_RIGHT} />
          </View>
          <View style={styles.dpadRow}>
            <View style={styles.dpadEmpty} />
            <DpadBtn label="▼" value={GAME_INPUT_DOWN} />
            <View style={styles.dpadEmpty} />
          </View>
        </View>

        {/* Fire button */}
        <TouchableOpacity
          style={styles.fireBtn}
          onPressIn={() => startHold(GAME_INPUT_FIRE)}
          onPressOut={endHold}
          activeOpacity={0.6}
        >
          <Text style={styles.fireLabel}>FIRE</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Hold buttons for continuous input</Text>
    </View>
  );
}

const BTN = 80;

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  header:      { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backBtn:     { paddingRight: 16, paddingVertical: 8 },
  backText:    { color: '#00d4ff', fontSize: 16 },
  title:       { color: '#fff', fontSize: 22, fontWeight: '700' },
  status:      { color: '#ff9900', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  gamepad:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 48 },
  dpad:        { gap: 4 },
  dpadRow:     { flexDirection: 'row', gap: 4 },
  dpadBtn:     { width: BTN, height: BTN, backgroundColor: '#2a2a2a', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#444' },
  dpadEmpty:   { width: BTN, height: BTN },
  dpadCenter:  { width: BTN, height: BTN, backgroundColor: '#1a1a1a', borderRadius: 12 },
  dpadLabel:   { color: '#fff', fontSize: 28, fontWeight: '700' },
  fireBtn:     { width: 120, height: 120, backgroundColor: '#8b0000', borderRadius: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#e74c3c' },
  fireLabel:   { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  hint:        { color: '#555', fontSize: 12, textAlign: 'center', paddingBottom: 24 },
});
