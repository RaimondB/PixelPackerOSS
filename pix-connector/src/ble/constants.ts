// Direct port of mod_0732 from the original APK bundle.
// Three hardware variants use different UUID bases.

const LEGACY_UUID = (short: string) => `0000${short}-e984-11e7-b78e-ffd6fcc3450f`;
const V1_UUID    = (short: string) => `0000${short}-e984-11e7-b78e-ffd6fcc34510`;
const MINI_UUID  = (short: string) => `0000${short}-9552-4325-8021-a85f8136a5c4`;

export type UuidBuilder = (short: string) => string;

export const PIX_UUID_BUILDERS = {
  LEGACY: LEGACY_UUID,
  V1:     V1_UUID,
  MINI:   MINI_UUID,
} as const;

export const PIX_BLE_SERVICE = {
  UUID:                       '0100',
  RPC_REQ_CHARACTERISTIC:     '0101',
  RPC_RES_CHARACTERISTIC:     '0101',
  WIDTH_CHARACTERISTIC:       '0103',
  HEIGHT_CHARACTERISTIC:      '0104',
  MAX_FRAME_CHARACTERISTIC:   '0105',
  BRIGHTNESS_CHARACTERISTIC:  '0106',
  OTA_ENABLED_CHARACTERISTIC: '0107',
  OTA_CONFIG_CHARACTERISTIC:  '0108',
  OTA_STATE_CHARACTERISTIC:   '0109',
  DEMO_MODE_STATE_DISABLED:   '0110',
} as const;

// All three service UUIDs flattened — used as the BLE scan filter.
export const POSSIBLE_PIX_SERVICE_UUIDS = [
  LEGACY_UUID(PIX_BLE_SERVICE.UUID),
  V1_UUID(PIX_BLE_SERVICE.UUID),
  MINI_UUID(PIX_BLE_SERVICE.UUID),
];

export const DEVICE_INFORMATION_SERVICE       = '180A';
export const FIRMWARE_REVISION_CHARACTERISTIC = '2A26';
export const HARDWARE_REVISION_CHARACTERISTIC = '2A27';

// RPC opcodes
export const OPCODE_SET_FRAME                 = 0;
export const OPCODE_SET_PALETTE               = 1;
export const OPCODE_SET_FRAME_COUNT           = 2;
export const OPCODE_SET_FRAMES_DURATIONS      = 3;
export const OPCODE_SET_ANIMATION_DIRECTION   = 4;
export const OPCODE_SAVE_TO_PERSISTENT_MEMORY = 5;
export const OPCODE_PRINT_MEMORY              = 6;
export const OPCODE_SET_CONFIG                = 7;
export const OPCODE_SET_INPUT                 = 8;
export const OPCODE_RESTART                   = 9;

// Display modes (value written to OPCODE_SET_CONFIG)
export const MODE_NONE          = 0;
export const MODE_ANIMATION     = 1;
export const MODE_SCROLLING     = 2;
export const MODE_OTA_PROGRESS  = 3;
export const MODE_CLOCK         = 6;
export const MODE_BIKE          = 7;
export const MODE_COUNTDOWN     = 8;
export const MODE_STOPWATCH     = 9;
export const MODE_PIX_BLOCKS    = 16;
export const MODE_PIXEL_BREAKER = 17;
export const MODE_CRAWLER       = 18;

// Bike widget stages — from bike_734.js: _setStage writes [MODE_BIKE, stage, 0] via setRenderMode
export const BIKE_STAGE_INIT  = 0;
export const BIKE_STAGE_IDLE  = 1;
export const BIKE_STAGE_STOP  = 2;
export const BIKE_STAGE_LEFT  = 3;
export const BIKE_STAGE_RIGHT = 4;

// Game d-pad values sent via OPCODE_SET_INPUT payload [inputId, value]
export const GAME_INPUT_LEFT  = 1;
export const GAME_INPUT_RIGHT = 2;
export const GAME_INPUT_UP    = 3;
export const GAME_INPUT_DOWN  = 4;
export const GAME_INPUT_FIRE  = 5;
