// Port of mod_0771 — singleton that wraps react-native-ble-manager.
// All BLE operations go through this single instance.

import BleManager from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const BleManagerModule = NativeModules.BleManager;
const bleEmitter = new NativeEventEmitter(BleManagerModule);

export const BLE_EVENTS = {
  SCAN_STOPPED:          'BleManagerStopScan',
  STATE_CHANGED:         'BleManagerDidUpdateState',
  FOUND_DEVICE:          'BleManagerDiscoverPeripheral',
  CHARACTERISTIC_UPDATE: 'BleManagerDidUpdateValueForCharacteristic',
  CONNECTED:             'BleManagerConnectPeripheral',
  DISCONNECTED:          'BleManagerDisconnectPeripheral',
} as const;

class BleService {
  async init() {
    await BleManager.start({ showAlert: false });
  }

  on(event: string, handler: (data: any) => void): () => void {
    const sub = bleEmitter.addListener(event, handler);
    return () => sub.remove();
  }

  async scan(serviceUUIDs: string[], seconds: number): Promise<void> {
    await BleManager.scan(serviceUUIDs, seconds, false, {
      numberOfMatches: 3,
      matchMode: 1,
      scanMode: 2, // LOW_LATENCY
      reportDelay: 0,
    });
  }

  async stopScan(): Promise<void> {
    await BleManager.stopScan();
  }

  async connect(peripheralId: string): Promise<void> {
    return Promise.race([
      BleManager.connect(peripheralId),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000),
      ),
    ]) as Promise<void>;
  }

  async disconnect(peripheralId: string): Promise<void> {
    await BleManager.disconnect(peripheralId);
  }

  async retrieveServices(peripheralId: string) {
    return BleManager.retrieveServices(peripheralId);
  }

  async requestMTU(peripheralId: string, mtu: number): Promise<number | undefined> {
    if (Platform.OS === 'android' && (Platform.Version as number) >= 21) {
      return BleManager.requestMTU(peripheralId, mtu);
    }
  }

  async read(peripheralId: string, serviceUUID: string, charUUID: string): Promise<number[]> {
    return BleManager.read(peripheralId, serviceUUID, charUUID);
  }

  // maxByteSize must match data.length — ble-manager uses it for chunking
  async write(peripheralId: string, serviceUUID: string, charUUID: string, data: number[]): Promise<void> {
    await BleManager.write(peripheralId, serviceUUID, charUUID, data, data.length);
  }

  async isConnected(peripheralId: string): Promise<boolean> {
    return BleManager.isPeripheralConnected(peripheralId, []);
  }

  async removeFromCache(peripheralId: string): Promise<void> {
    await BleManager.removePeripheral(peripheralId);
  }
}

export default new BleService();
