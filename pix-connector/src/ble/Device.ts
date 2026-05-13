// Port of mod_0781 — peripheral wrapper that delegates to BleService.

import type { Peripheral } from 'react-native-ble-manager';
import BleService from './BleService';

export class Device {
  id: string;
  name: string;
  rssi: number;
  serviceUUIDs: string[];

  constructor(peripheral: Peripheral) {
    this.id = peripheral.id;
    this.rssi = peripheral.rssi;
    this.name = peripheral.advertising?.localName || peripheral.name || 'Unknown';
    this.serviceUUIDs = peripheral.advertising?.serviceUUIDs ?? [];
  }

  isConnected()                     { return BleService.isConnected(this.id); }
  connect()                         { return BleService.connect(this.id); }
  disconnect()                      { return BleService.disconnect(this.id); }
  requestMTU(mtu: number)           { return BleService.requestMTU(this.id, mtu); }
  retrieveServices()                { return BleService.retrieveServices(this.id); }
  read(svc: string, chr: string)    { return BleService.read(this.id, svc, chr); }
  write(svc: string, chr: string, data: number[]) {
    return BleService.write(this.id, svc, chr, data);
  }
}
