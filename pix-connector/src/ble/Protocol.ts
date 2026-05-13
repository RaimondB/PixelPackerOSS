// Port of mod_0797. Resolves full 128-bit UUIDs from short codes
// by detecting which hardware variant is connected.

import {
  PIX_UUID_BUILDERS,
  PIX_BLE_SERVICE,
  POSSIBLE_PIX_SERVICE_UUIDS,
  type UuidBuilder,
} from './constants';

function detectBuilder(serviceUUIDs: string[]): UuidBuilder {
  if (!serviceUUIDs.length) return PIX_UUID_BUILDERS.V1;
  const lower = serviceUUIDs.map(u => u.toLowerCase());
  // MINI has a distinct base — check its service UUID
  if (lower.some(u => u === POSSIBLE_PIX_SERVICE_UUIDS[2])) return PIX_UUID_BUILDERS.MINI;
  // LEGACY vs V1 differ only in last byte of the base
  if (lower.some(u => u === POSSIBLE_PIX_SERVICE_UUIDS[0])) return PIX_UUID_BUILDERS.LEGACY;
  return PIX_UUID_BUILDERS.V1;
}

export class Protocol {
  private build: UuidBuilder;

  constructor(serviceUUIDs: string[]) {
    this.build = detectBuilder(serviceUUIDs);
  }

  getServiceUuid()            { return this.build(PIX_BLE_SERVICE.UUID); }
  get width()                 { return this.build(PIX_BLE_SERVICE.WIDTH_CHARACTERISTIC); }
  get height()                { return this.build(PIX_BLE_SERVICE.HEIGHT_CHARACTERISTIC); }
  get maxFrameCount()         { return this.build(PIX_BLE_SERVICE.MAX_FRAME_CHARACTERISTIC); }
  get brightness()            { return this.build(PIX_BLE_SERVICE.BRIGHTNESS_CHARACTERISTIC); }
  get demoModeState()         { return this.build(PIX_BLE_SERVICE.DEMO_MODE_STATE_DISABLED); }
  get rpcReqCharacteristic()  { return this.build(PIX_BLE_SERVICE.RPC_REQ_CHARACTERISTIC); }
  get otaEnabledState()       { return this.build(PIX_BLE_SERVICE.OTA_ENABLED_CHARACTERISTIC); }
  get otaConfig()             { return this.build(PIX_BLE_SERVICE.OTA_CONFIG_CHARACTERISTIC); }
  get otaState()              { return this.build(PIX_BLE_SERVICE.OTA_STATE_CHARACTERISTIC); }
}
