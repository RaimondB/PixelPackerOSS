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
  BIKE_STAGE_IDLE,
  BIKE_STAGE_LEFT,
  BIKE_STAGE_RIGHT,
  BIKE_STAGE_STOP,
  BIKE_STAGE_INIT,
} from '../ble/constants';

interface Props {
  device: Backpack;
  onBack: () => void;
}

type Stage = 'left' | 'right' | 'stop' | 'idle' | null;

export function BikeScreen({ device, onBack }: Props) {
  const [active, setActive] = useState<Stage>(null);
  const [status, setStatus] = useState('');
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    device.setBikeStage(BIKE_STAGE_INIT).catch(() => {});
    return () => {
      stopBlink();
      device.setBikeStage(BIKE_STAGE_IDLE).catch(() => {});
    };
  }, [device]);

  const stopBlink = useCallback(() => {
    if (blinkRef.current) {
      clearInterval(blinkRef.current);
      blinkRef.current = null;
    }
  }, []);

  const setStage = useCallback(async (stage: number, label: Stage) => {
    stopBlink();
    try {
      await device.setBikeStage(stage);
      setActive(label);
      setStatus('');
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      Alert.alert('Error', e.message);
    }
  }, [device, stopBlink]);

  const handleLeft = useCallback(() => setStage(BIKE_STAGE_LEFT, 'left'), [setStage]);
  const handleRight = useCallback(() => setStage(BIKE_STAGE_RIGHT, 'right'), [setStage]);
  const handleStop = useCallback(() => setStage(BIKE_STAGE_STOP, 'stop'), [setStage]);
  const handleIdle = useCallback(() => setStage(BIKE_STAGE_IDLE, 'idle'), [setStage]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bike Signals</Text>
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      {/* Turn indicators row */}
      <View style={styles.turnRow}>
        <TouchableOpacity
          style={[styles.turnBtn, styles.leftBtn, active === 'left' && styles.activeLeft]}
          onPress={handleLeft}
          activeOpacity={0.7}
        >
          <Text style={styles.arrow}>◄◄</Text>
          <Text style={styles.turnLabel}>Left</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.turnBtn, styles.rightBtn, active === 'right' && styles.activeRight]}
          onPress={handleRight}
          activeOpacity={0.7}
        >
          <Text style={styles.arrow}>►►</Text>
          <Text style={styles.turnLabel}>Right</Text>
        </TouchableOpacity>
      </View>

      {/* Stop / Idle row */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={[styles.controlBtn, active === 'stop' && styles.activeStop]}
          onPress={handleStop}
          activeOpacity={0.7}
        >
          <Text style={styles.controlIcon}>⛔</Text>
          <Text style={styles.controlLabel}>Stop / Brake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, active === 'idle' && styles.activeIdle]}
          onPress={handleIdle}
          activeOpacity={0.7}
        >
          <Text style={styles.controlIcon}>○</Text>
          <Text style={styles.controlLabel}>Off / Idle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  header:       { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backBtn:      { paddingRight: 16, paddingVertical: 8 },
  backText:     { color: '#00d4ff', fontSize: 16 },
  title:        { color: '#fff', fontSize: 22, fontWeight: '700' },
  status:       { color: '#ff9900', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  turnRow:      { flexDirection: 'row', gap: 16, flex: 1, maxHeight: 220 },
  turnBtn:      { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  leftBtn:      { backgroundColor: '#1a1a00', borderColor: '#ffa500' },
  rightBtn:     { backgroundColor: '#1a1a00', borderColor: '#ffa500' },
  activeLeft:   { backgroundColor: '#ffa500', borderColor: '#ffcc00' },
  activeRight:  { backgroundColor: '#ffa500', borderColor: '#ffcc00' },
  arrow:        { fontSize: 48, color: '#ffa500' },
  turnLabel:    { fontSize: 20, fontWeight: '700', color: '#ffa500', marginTop: 8 },
  bottomRow:    { flexDirection: 'row', gap: 16, marginTop: 24, maxHeight: 180 },
  controlBtn:   { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#444' },
  activeStop:   { backgroundColor: '#c0392b', borderColor: '#e74c3c' },
  activeIdle:   { backgroundColor: '#1e3a1e', borderColor: '#2ecc71' },
  controlIcon:  { fontSize: 40 },
  controlLabel: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 8 },
});
