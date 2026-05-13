import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import type { Peripheral } from 'react-native-ble-manager';
import BleService, { BLE_EVENTS } from '../ble/BleService';
import { Backpack } from '../ble/Backpack';
import { POSSIBLE_PIX_SERVICE_UUIDS } from '../ble/constants';

interface Props {
  onDeviceSelected: (device: Backpack) => void;
}

async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if ((Platform.Version as number) >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

// ── Pixel logo ─────────────────────────────────────────────────────────────────
// Same diamond burst pattern as the app icon: orange ring, cyan center.
const LOGO_PATTERN = [
  [0, 0, 1, 0, 0],
  [0, 1, 2, 1, 0],
  [1, 2, 2, 2, 1],
  [0, 1, 2, 1, 0],
  [0, 0, 1, 0, 0],
] as const; // 0=off, 1=orange, 2=cyan

function PixelLogo({ cellSize = 10 }: { cellSize?: number }) {
  const COLOR = ['#1a2035', '#ffa500', '#00d4ff'] as const;
  const n = LOGO_PATTERN.length;
  return (
    <View style={{ width: n * cellSize, height: n * cellSize, position: 'relative' }}>
      {LOGO_PATTERN.flatMap((row, r) =>
        row.map((val, c) => (
          <View
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              left: c * cellSize,
              top: r * cellSize,
              width: cellSize - 2,
              height: cellSize - 2,
              backgroundColor: COLOR[val],
              borderRadius: 2,
            }}
          />
        )),
      )}
    </View>
  );
}

// ── Signal strength bars ───────────────────────────────────────────────────────
function SignalBars({ rssi }: { rssi: number }) {
  const bars = rssi >= -60 ? 4 : rssi >= -70 ? 3 : rssi >= -80 ? 2 : 1;
  return (
    <View style={sigStyles.row}>
      {[1, 2, 3, 4].map(b => (
        <View
          key={b}
          style={[sigStyles.bar, { height: 4 + b * 4 }, b <= bars ? sigStyles.barOn : sigStyles.barOff]}
        />
      ))}
    </View>
  );
}
const sigStyles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar:    { width: 5, borderRadius: 2 },
  barOn:  { backgroundColor: '#00d4ff' },
  barOff: { backgroundColor: '#252535' },
});

// ── Screen ─────────────────────────────────────────────────────────────────────
export function DeviceListScreen({ onDeviceSelected }: Props) {
  const [devices, setDevices] = useState<Backpack[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const seenIds = useRef(new Set<string>());
  const offFoundRef = useRef<(() => void) | null>(null);

  // Sonar ripple animation
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanning) {
      ripple1.setValue(0);
      ripple2.setValue(0);
      return;
    }
    const makeRipple = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    const a1 = makeRipple(ripple1, 0);
    const a2 = makeRipple(ripple2, 900);
    a1.start();
    a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, [scanning, ripple1, ripple2]);

  const rippleStyle = (val: Animated.Value) => ({
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
    opacity:   val.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.35, 0] }),
  });

  useEffect(() => {
    BleService.init();
    const offStop = BleService.on(BLE_EVENTS.SCAN_STOPPED, () => {
      setScanning(false);
      offFoundRef.current?.();
      offFoundRef.current = null;
    });
    return () => {
      offStop();
      offFoundRef.current?.();
    };
  }, []);

  const startScan = useCallback(async () => {
    const granted = await requestBlePermissions();
    if (!granted) {
      Alert.alert('Permission required', 'Bluetooth permissions are required to find your backpack.');
      return;
    }
    offFoundRef.current?.();
    seenIds.current.clear();
    setDevices([]);
    setScanning(true);
    offFoundRef.current = BleService.on(BLE_EVENTS.FOUND_DEVICE, (p: Peripheral) => {
      if (!Backpack.isBackpack(p) || seenIds.current.has(p.id)) return;
      seenIds.current.add(p.id);
      setDevices(prev => [...prev, new Backpack(p)]);
    });
    await BleService.scan(POSSIBLE_PIX_SERVICE_UUIDS, 10);
  }, []);

  const connect = useCallback(async (device: Backpack) => {
    setConnecting(device.id);
    try {
      await BleService.stopScan();
      await device.connect();
      await device.initialize();
      onDeviceSelected(device);
    } catch (err: any) {
      Alert.alert('Connection failed', err.message ?? 'Unknown error');
    } finally {
      setConnecting(null);
    }
  }, [onDeviceSelected]);

  return (
    <View style={styles.container}>
      {/* ── Brand header ── */}
      <View style={styles.header}>
        <PixelLogo cellSize={12} />
        <Text style={styles.appName}>PixelPacker</Text>
        <Text style={styles.appSub}>LED Backpack Controller</Text>
      </View>

      {/* ── Scan button with sonar ripple ── */}
      <View style={styles.scanArea}>
        <Animated.View style={[styles.ripple, rippleStyle(ripple1)]} />
        <Animated.View style={[styles.ripple, rippleStyle(ripple2)]} />
        <TouchableOpacity
          style={[styles.scanBtn, scanning && styles.scanBtnActive]}
          onPress={scanning ? () => BleService.stopScan() : startScan}
          activeOpacity={0.85}
        >
          {scanning
            ? <ActivityIndicator color="#000" style={styles.spinner} />
            : <Text style={styles.scanIcon}>⬡</Text>
          }
          <Text style={styles.scanBtnText}>
            {scanning ? 'Scanning…  Tap to stop' : 'Scan for Backpacks'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Device list ── */}
      {(devices.length > 0 || scanning) && (
        <Text style={styles.sectionLabel}>
          {devices.length > 0 ? `${devices.length} found` : 'Searching nearby…'}
        </Text>
      )}

      <FlatList
        data={devices}
        keyExtractor={d => d.id}
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceRow}
            onPress={() => connect(item)}
            disabled={connecting !== null}
            activeOpacity={0.75}
          >
            <View style={styles.deviceIcon}>
              <PixelLogo cellSize={5} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.deviceMeta}>{item.address ?? item.id}</Text>
            </View>
            <View style={styles.deviceRight}>
              <SignalBars rssi={item.rssi ?? -90} />
              <Text style={styles.rssiText}>{item.rssi} dBm</Text>
            </View>
            {connecting === item.id
              ? <ActivityIndicator color="#00d4ff" style={styles.connectSpinner} />
              : <Text style={styles.connectLabel}>→</Text>
            }
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !scanning ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={styles.emptyTitle}>No devices found</Text>
              <Text style={styles.emptyBody}>
                Make sure your backpack is powered on and within range, then tap Scan.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0a0a0a', paddingHorizontal: 20 },

  // Header
  header:         { alignItems: 'center', paddingTop: 40, paddingBottom: 28, gap: 10 },
  appName:        { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
  appSub:         { color: '#555', fontSize: 13, letterSpacing: 0.5 },

  // Scan area
  scanArea:       { alignItems: 'center', marginBottom: 28 },
  ripple:         {
    position: 'absolute',
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2, borderColor: '#00d4ff',
    alignSelf: 'center',
  },
  scanBtn:        {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#00d4ff', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 28,
  },
  scanBtnActive:  { backgroundColor: '#007a95' },
  scanIcon:       { color: '#000', fontSize: 18 },
  scanBtnText:    { color: '#000', fontWeight: '700', fontSize: 15 },
  spinner:        { marginRight: 0 },

  // Section label
  sectionLabel:   {
    color: '#444', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
  },

  // Device row
  list:           { flex: 1 },
  deviceRow:      {
    backgroundColor: '#111520', borderRadius: 12,
    padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#1e2235',
  },
  deviceIcon:     { marginRight: 12 },
  deviceInfo:     { flex: 1 },
  deviceName:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  deviceMeta:     { color: '#555', fontSize: 11, marginTop: 3, fontFamily: 'monospace' },
  deviceRight:    { alignItems: 'flex-end', gap: 4, marginRight: 12 },
  rssiText:       { color: '#444', fontSize: 10 },
  connectLabel:   { color: '#00d4ff', fontSize: 20, fontWeight: '300' },
  connectSpinner: { marginLeft: 4 },

  // Empty state
  emptyState:     { alignItems: 'center', marginTop: 48, paddingHorizontal: 24 },
  emptyIcon:      { fontSize: 48, marginBottom: 16 },
  emptyTitle:     { color: '#666', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyBody:      { color: '#444', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
