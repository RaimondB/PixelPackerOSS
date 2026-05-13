// Port of mod_0769 — static helpers for scanning / finding Backpack devices.

import type { Peripheral } from 'react-native-ble-manager';
import BleService, { BLE_EVENTS } from './BleService';
import { Backpack } from './Backpack';
import { POSSIBLE_PIX_SERVICE_UUIDS } from './constants';

export class BackpackRepository {
  static scan(timeoutSeconds = 10): Promise<Backpack[]> {
    return new Promise((resolve) => {
      const found: Peripheral[] = [];
      const seenIds = new Set<string>();

      const offFound = BleService.on(BLE_EVENTS.FOUND_DEVICE, (p: Peripheral) => {
        if (seenIds.has(p.id) || !Backpack.isBackpack(p)) return;
        seenIds.add(p.id);
        found.push(p);
      });

      BleService.on(BLE_EVENTS.SCAN_STOPPED, () => {
        offFound();
        resolve(found.map(p => new Backpack(p)));
      });

      BleService.scan(POSSIBLE_PIX_SERVICE_UUIDS, timeoutSeconds);
    });
  }

  static stopScan(): Promise<void> {
    return BleService.stopScan();
  }
}
