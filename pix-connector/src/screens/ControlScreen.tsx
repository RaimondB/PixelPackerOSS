import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { Backpack } from '../ble/Backpack';
import BleService, { BLE_EVENTS } from '../ble/BleService';
import { toUint16Bytes } from '../ble/utils';
import {
  MODE_NONE, MODE_ANIMATION, MODE_SCROLLING,
  MODE_CLOCK, MODE_STOPWATCH, MODE_COUNTDOWN,
  MODE_BIKE, MODE_PIX_BLOCKS, MODE_PIXEL_BREAKER, MODE_CRAWLER,
} from '../ble/constants';

export type NavigateTo = 'bike' | 'pixel-breaker' | 'animation-editor' | 'scrolling-text';

interface Props {
  device: Backpack;
  onDisconnect: () => void;
  onNavigate: (screen: NavigateTo) => void;
}

interface DeviceInfo {
  width: number;
  height: number;
  maxFrames: number;
  firmware: string;
  hardware: string;
}

// Modes that open a dedicated control screen instead of just setting the mode
const INTERACTIVE_MODES = new Set([MODE_BIKE, MODE_PIXEL_BREAKER]);

const MODES = [
  { label: 'Animation',     value: MODE_ANIMATION },
  { label: 'Clock',         value: MODE_CLOCK },
  { label: 'Scrolling',     value: MODE_SCROLLING },
  { label: 'Stopwatch',     value: MODE_STOPWATCH },
  { label: 'Countdown',     value: MODE_COUNTDOWN },
  { label: 'Bike ▶',        value: MODE_BIKE },
  { label: 'Pix Blocks',    value: MODE_PIX_BLOCKS },
  { label: 'Pixel Breaker ▶', value: MODE_PIXEL_BREAKER },
  { label: 'Crawler',       value: MODE_CRAWLER },
  { label: 'Off',           value: MODE_NONE },
] as const;

export function ControlScreen({ device, onDisconnect, onNavigate }: Props) {
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [brightness, setBrightness] = useState(50);
  const [activeMode, setActiveMode] = useState<number | null>(null);
  const [status, setStatus] = useState('Loading device info…');
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(true);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load device info on mount
  useEffect(() => {
    async function load() {
      try {
        const [w, h, mf, fw, hw, br] = await Promise.all([
          device.readWidth(),
          device.readHeight(),
          device.readMaxFrameCount(),
          device.readFirmwareVersion(),
          device.readHardwareVersion(),
          device.readBrightness(),
        ]);
        setInfo({ width: w, height: h, maxFrames: mf, firmware: fw, hardware: hw });
        setBrightness(br);
        setStatus('');
      } catch (err: any) {
        setStatus(`Failed to read device: ${err.message}`);
      }
    }
    load();
  }, [device]);

  // Auto-reconnect on disconnect
  useEffect(() => {
    const clearTimer = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    const tryReconnect = async () => {
      reconnectAttempt.current += 1;
      const n = reconnectAttempt.current;
      setStatus(`Reconnecting… (attempt ${n}/3)`);
      try {
        await BleService.connect(device.id);
        await device.initialize();
        setConnected(true);
        setStatus('Reconnected.');
        reconnectAttempt.current = 0;
      } catch {
        if (reconnectAttempt.current < 3) {
          reconnectTimer.current = setTimeout(tryReconnect, 2500);
        } else {
          setStatus('Could not reconnect. Tap Reconnect to try again.');
        }
      }
    };

    const unsub = BleService.on(BLE_EVENTS.DISCONNECTED, ({ peripheral }: { peripheral: string }) => {
      if (peripheral !== device.id) return;
      setConnected(false);
      clearTimer();
      reconnectAttempt.current = 0;
      reconnectTimer.current = setTimeout(tryReconnect, 1000);
    });

    return () => {
      unsub();
      clearTimer();
    };
  }, [device]);

  const manualReconnect = useCallback(async () => {
    reconnectAttempt.current = 0;
    setStatus('Reconnecting…');
    try {
      await BleService.connect(device.id);
      await device.initialize();
      setConnected(true);
      setStatus('Reconnected.');
    } catch (e: any) {
      setStatus(`Reconnect failed: ${e.message}`);
    }
  }, [device]);

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    setStatus(`${label}…`);
    try {
      await fn();
      setStatus(`${label} done.`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const adjustBrightness = useCallback(async (delta: number) => {
    const next = Math.max(0, Math.min(100, brightness + delta));
    await run(`Brightness → ${next}%`, async () => {
      await device.setBrightness(next);
      setBrightness(next);
    });
  }, [brightness, device, run]);

  const handleMode = useCallback(async (mode: number, label: string) => {
    if (mode === MODE_BIKE) {
      onNavigate('bike');
      return;
    }
    if (mode === MODE_PIXEL_BREAKER) {
      onNavigate('pixel-breaker');
      return;
    }
    await run(`Mode → ${label}`, async () => {
      await device.setRenderMode(mode);
      setActiveMode(mode);
    });
  }, [device, onNavigate, run]);

  const uploadTestAnimation = useCallback(async () => {
    await run('Upload test animation', async () => {
      const w = info?.width ?? 16;
      const h = info?.height ?? 16;
      const pixelCount = w * h;
      // 8bpp: one byte per pixel = palette index 0 (red)
      const frameBytes = new Array(pixelCount).fill(0x00);
      const paletteRed = [255, 0, 0];
      await device.setRenderModeNone();
      await device.setFrameCount(0);              // reset first
      await device.setPalette(paletteRed, 0);
      await device.setFrame(0, frameBytes);
      await device.setFrameDurations(toUint16Bytes(2000));
      await device.setAnimationDirection(0);
      await device.setFrameCount(1);              // actual count last
      await device.saveAnimationToPersistentMemory();
      await device.setRenderMode(MODE_ANIMATION);
      setActiveMode(MODE_ANIMATION);
    });
  }, [device, info, run]);

  const disconnect = useCallback(async () => {
    try { await device.disconnect(); } finally { onDisconnect(); }
  }, [device, onDisconnect]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header with connection indicator */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{device.name}</Text>
          {info && (
            <Text style={styles.meta}>
              {info.width}×{info.height} · {info.maxFrames} frames · FW {info.firmware}
            </Text>
          )}
        </View>
        <View style={[styles.connDot, connected ? styles.connDotOn : styles.connDotOff]} />
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      {!connected && (
        <TouchableOpacity style={styles.reconnectBtn} onPress={manualReconnect}>
          <Text style={styles.reconnectText}>Reconnect</Text>
        </TouchableOpacity>
      )}

      {/* Brightness */}
      <SectionHeader label="Brightness" />
      <View style={styles.row}>
        <Btn label="−10" onPress={() => adjustBrightness(-10)} disabled={busy || !connected} />
        <Text style={styles.brightnessVal}>{brightness}%</Text>
        <Btn label="+10" onPress={() => adjustBrightness(10)} disabled={busy || !connected} />
      </View>
      <View style={styles.row}>
        <Btn label="0%" onPress={() => run('Brightness → 0%', async () => { await device.setBrightness(0); setBrightness(0); })} disabled={busy || !connected} />
        <Btn label="50%" onPress={() => run('Brightness → 50%', async () => { await device.setBrightness(50); setBrightness(50); })} disabled={busy || !connected} />
        <Btn label="100%" onPress={() => run('Brightness → 100%', async () => { await device.setBrightness(100); setBrightness(100); })} disabled={busy || !connected} />
      </View>

      {/* Display Modes */}
      <SectionHeader label="Display Mode" />
      <View style={styles.modeGrid}>
        {MODES.map(m => (
          <Btn
            key={m.value}
            label={m.label}
            onPress={() => handleMode(m.value, m.label)}
            disabled={busy || !connected}
            active={activeMode === m.value && !INTERACTIVE_MODES.has(m.value)}
            highlight={INTERACTIVE_MODES.has(m.value)}
          />
        ))}
      </View>

      {/* Animation Editor */}
      <SectionHeader label="Animation" />
      <View style={styles.row}>
        <Btn
          label="Animation Editor ▶"
          onPress={() => onNavigate('animation-editor')}
          primary
        />
        <Btn
          label="Scrolling Text ▶"
          onPress={() => onNavigate('scrolling-text')}
          highlight
        />
      </View>
      <Btn
        label={busy ? 'Working…' : 'Upload Solid Red (test)'}
        onPress={uploadTestAnimation}
        disabled={busy || !connected}
      />
      {busy && <ActivityIndicator color="#00d4ff" style={styles.spinner} />}

      {/* Device */}
      <SectionHeader label="Device" />
      <View style={styles.row}>
        <Btn label="Restart" onPress={() => run('Restart', () => device.restart())} disabled={busy || !connected} />
      </View>
      <Btn label="Disconnect" onPress={disconnect} danger />
    </ScrollView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

interface BtnProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
  active?: boolean;
  highlight?: boolean;
}
function Btn({ label, onPress, disabled, primary, danger, active, highlight }: BtnProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        primary    && styles.btnPrimary,
        danger     && styles.btnDanger,
        active     && styles.btnActive,
        highlight  && styles.btnHighlight,
        disabled   && styles.btnDisabled,
      ]}
    >
      <Text style={[styles.btnText, (primary || danger) && styles.btnTextDark]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll:          { flex: 1, backgroundColor: '#0a0a0a' },
  container:       { padding: 20, paddingBottom: 40 },
  headerRow:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8 },
  headerLeft:      { flex: 1 },
  title:           { color: '#fff', fontSize: 24, fontWeight: '700' },
  meta:            { color: '#888', fontSize: 12, marginTop: 4 },
  connDot:         { width: 14, height: 14, borderRadius: 7, marginTop: 6 },
  connDotOn:       { backgroundColor: '#2ecc71' },
  connDotOff:      { backgroundColor: '#c0392b' },
  status:          { color: '#00d4ff', fontSize: 13, marginTop: 8, marginBottom: 4 },
  reconnectBtn:    { backgroundColor: '#1a3a1a', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#2ecc71' },
  reconnectText:   { color: '#2ecc71', fontWeight: '700' },
  sectionHeader:   { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  row:             { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  brightnessVal:   { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center', alignSelf: 'center' },
  spinner:         { marginTop: 12 },
  btn:             { backgroundColor: '#1e1e1e', borderRadius: 8, padding: 12, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  btnPrimary:      { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
  btnDanger:       { backgroundColor: '#c0392b', borderColor: '#c0392b', marginTop: 16 },
  btnActive:       { borderColor: '#00d4ff', borderWidth: 2 },
  btnHighlight:    { borderColor: '#ffa500', borderWidth: 1 },
  btnDisabled:     { opacity: 0.4 },
  btnText:         { color: '#fff', fontWeight: '600', fontSize: 14 },
  btnTextDark:     { color: '#000' },
});
