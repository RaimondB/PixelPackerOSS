// Port of mod_0784 — main device class with all Pix Backpack commands.
// isBackpack() filter matches the original naming convention:
//   device name = "pix <...words...> <12-hex-char MAC>"

import type { Peripheral } from 'react-native-ble-manager';
import { Device } from './Device';
import { Protocol } from './Protocol';
import { toUint16Bytes, bytesToUnsignedNumber, bytesToString } from './utils';
import * as C from './constants';

const PIX_MAC_RE = /^[0-9a-f]{12}$/;

function extractMac(name: string | undefined | null): string | null {
  if (!name) return null;
  const parts = name.toLowerCase().split(' ');
  return parts[0] === 'pix' && PIX_MAC_RE.test(parts[parts.length - 1])
    ? parts[parts.length - 1]
    : null;
}

export class Backpack extends Device {
  address: string | null;
  protocol: Protocol;
  private _rpcCallIdCounter = 0;
  private _inputId = 0;

  constructor(peripheral: Peripheral) {
    super(peripheral);
    this.address = extractMac(peripheral.advertising?.localName ?? this.name);
    this.protocol = new Protocol(this.serviceUUIDs);
  }

  static isBackpack(peripheral: Peripheral): boolean {
    const name = peripheral.advertising?.localName ?? peripheral.name;
    return Boolean(extractMac(name));
  }

  setServiceUUIDs(uuids: string[]) {
    this.serviceUUIDs = uuids;
    this.protocol = new Protocol(uuids);
  }

  async initialize(): Promise<void> {
    const info = await this.retrieveServices();
    // Re-resolve UUID variant from discovered services (more reliable than advertising)
    const discovered = (info.services ?? []).map((s: any) =>
      typeof s === 'string' ? s : (s.uuid as string),
    );
    if (discovered.length > 0) this.setServiceUUIDs(discovered);
    // MTU 517 enables large frame writes without chunking delays
    try { await this.requestMTU(517); } catch (_) {}
  }

  // --- RPC infrastructure ---

  private _generateCallId(): number {
    const id = this._rpcCallIdCounter;
    this._rpcCallIdCounter = (this._rpcCallIdCounter + 1) % 256;
    return id;
  }

  sendCommand(opcode: number, payload: number[] = []): Promise<void> {
    const data = [this._generateCallId(), opcode, ...payload];
    return this.write(this.protocol.getServiceUuid(), this.protocol.rpcReqCharacteristic, data);
  }

  // --- Read characteristics ---

  async readWidth(): Promise<number> {
    const b = await this.read(this.protocol.getServiceUuid(), this.protocol.width);
    return b[0];
  }

  async readHeight(): Promise<number> {
    const b = await this.read(this.protocol.getServiceUuid(), this.protocol.height);
    return b[0];
  }

  async readMaxFrameCount(): Promise<number> {
    const b = await this.read(this.protocol.getServiceUuid(), this.protocol.maxFrameCount);
    return bytesToUnsignedNumber(b);
  }

  async readBrightness(): Promise<number> {
    const b = await this.read(this.protocol.getServiceUuid(), this.protocol.brightness);
    return Math.round((b[0] / 255) * 100);
  }

  async readFirmwareVersion(): Promise<string> {
    const b = await this.read(C.DEVICE_INFORMATION_SERVICE, C.FIRMWARE_REVISION_CHARACTERISTIC);
    return bytesToString(b);
  }

  async readHardwareVersion(): Promise<string> {
    const b = await this.read(C.DEVICE_INFORMATION_SERVICE, C.HARDWARE_REVISION_CHARACTERISTIC);
    return bytesToString(b);
  }

  // --- Write characteristics ---

  setBrightness(brightness: number): Promise<void> {
    const value = Math.floor(255 * Math.max(0, Math.min(100, brightness)) / 100);
    return this.write(this.protocol.getServiceUuid(), this.protocol.brightness, [value]);
  }

  // --- RPC commands (port of mod_0784 methods) ---

  // Bike widget: sets render mode config to [MODE_BIKE, stage, 0] (from bike_734.js)
  setBikeStage(stage: number): Promise<void> {
    return this.setRenderMode([C.MODE_BIKE, stage, 0]);
  }

  // Interactive input for games/widgets — inputId cycles 1-255 (from mod_0756.js)
  sendInput(value: number): Promise<void> {
    const id = (this._inputId % 255) + 1;
    this._inputId += 1;
    return this.sendCommand(C.OPCODE_SET_INPUT, [id, value]);
  }

  setRenderMode(configBytes: number | number[], offsetBytes?: [number, number]): Promise<void> {
    const offset = offsetBytes ?? toUint16Bytes(0);
    const config = Array.isArray(configBytes) ? configBytes : [configBytes];
    return this.sendCommand(C.OPCODE_SET_CONFIG, [...offset, ...config]);
  }

  setRenderModeNone(): Promise<void> {
    return this.setRenderMode(C.MODE_NONE);
  }

  setFrameCount(frameCount: number): Promise<void> {
    return this.sendCommand(C.OPCODE_SET_FRAME_COUNT, [frameCount]);
  }

  setPalette(paletteBytes: number[], startColorIndex = 0): Promise<void> {
    return this.sendCommand(C.OPCODE_SET_PALETTE, [startColorIndex, ...paletteBytes]);
  }

  setFrame(frameIndex: number, frameBytes: number[]): Promise<void> {
    return this.sendCommand(C.OPCODE_SET_FRAME, [
      ...toUint16Bytes(frameIndex),
      ...toUint16Bytes(0),
      ...frameBytes,
    ]);
  }

  setFrameDurations(durationBytes: number[]): Promise<void> {
    return this.sendCommand(C.OPCODE_SET_FRAMES_DURATIONS, [
      ...toUint16Bytes(0),
      ...durationBytes,
    ]);
  }

  setAnimationDirection(directionCode: number): Promise<void> {
    return this.sendCommand(C.OPCODE_SET_ANIMATION_DIRECTION, [directionCode]);
  }

  saveAnimationToPersistentMemory(): Promise<void> {
    return this.sendCommand(C.OPCODE_SAVE_TO_PERSISTENT_MEMORY);
  }

  restart(): Promise<void> {
    return this.sendCommand(C.OPCODE_RESTART);
  }
}
