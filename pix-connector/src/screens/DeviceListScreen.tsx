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

export function DeviceListScreen({ onDeviceSelected }: Props) {
  const [devices, setDevices] = useState<Backpack[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const seenIds = useRef(new Set<string>());
  const offFoundRef = useRef<(() => void) | null>(null);

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
      Alert.alert('Permission required', 'Bluetooth permissions are required to find your Pix Backpack.');
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
      <Text style={styles.title}>Pix Backpack</Text>
      <Text style={styles.subtitle}>Find and connect to your backpack</Text>

      <TouchableOpacity
        style={[styles.scanBtn, scanning && styles.scanBtnActive]}
        onPress={scanning ? () => BleService.stopScan() : startScan}
      >
        {scanning
          ? <><ActivityIndicator color="#000" style={styles.spinner} /><Text style={styles.scanBtnText}>Stop Scan</Text></>
          : <Text style={styles.scanBtnText}>Scan for Devices</Text>
        }
      </TouchableOpacity>

      <FlatList
        data={devices}
        keyExtractor={d => d.id}
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceRow}
            onPress={() => connect(item)}
            disabled={connecting !== null}
          >
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <Text style={styles.deviceMeta}>
                {item.address ?? item.id} · {item.rssi} dBm
              </Text>
            </View>
            {connecting === item.id
              ? <ActivityIndicator color="#00d4ff" />
              : <Text style={styles.connectLabel}>Connect</Text>
            }
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {scanning
              ? 'Searching for Pix Backpacks…\nMake sure your backpack is powered on.'
              : 'Press "Scan for Devices" to begin.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
  title:         { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 12 },
  subtitle:      { color: '#888', fontSize: 14, marginBottom: 24 },
  scanBtn:       { backgroundColor: '#00d4ff', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  scanBtnActive: { backgroundColor: '#0090b0' },
  scanBtnText:   { color: '#000', fontWeight: '700', fontSize: 16 },
  spinner:       { marginRight: 8 },
  list:          { flex: 1 },
  deviceRow:     { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  deviceInfo:    { flex: 1 },
  deviceName:    { color: '#fff', fontSize: 16, fontWeight: '600' },
  deviceMeta:    { color: '#888', fontSize: 12, marginTop: 2 },
  connectLabel:  { color: '#00d4ff', fontWeight: '600', fontSize: 14 },
  empty:         { color: '#555', textAlign: 'center', marginTop: 60, lineHeight: 22 },
});
