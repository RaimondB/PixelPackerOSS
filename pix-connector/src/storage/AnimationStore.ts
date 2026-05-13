import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pix_animations_v1';

export interface SavedAnimation {
  id: string;
  name: string;
  width: number;
  height: number;
  palette: string[];  // 16 hex colors e.g. '#ff0000'
  frames: number[][]; // each frame: flat array of color indices (0-15), length = width*height
  durations: number[]; // ms per frame, same length as frames
  createdAt: number;
}

async function readAll(): Promise<SavedAnimation[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedAnimation[];
  } catch {
    return [];
  }
}

async function writeAll(animations: SavedAnimation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(animations));
}

export const AnimationStore = {
  async list(): Promise<SavedAnimation[]> {
    return readAll();
  },

  async save(anim: SavedAnimation): Promise<void> {
    const all = await readAll();
    const idx = all.findIndex(a => a.id === anim.id);
    if (idx >= 0) {
      all[idx] = anim;
    } else {
      all.push(anim);
    }
    await writeAll(all);
  },

  async delete(id: string): Promise<void> {
    const all = await readAll();
    await writeAll(all.filter(a => a.id !== id));
  },

  async get(id: string): Promise<SavedAnimation | null> {
    const all = await readAll();
    return all.find(a => a.id === id) ?? null;
  },
};

export function newAnimation(width: number, height: number): SavedAnimation {
  return {
    id: `anim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: 'New Animation',
    width,
    height,
    palette: DEFAULT_PALETTE,
    frames: [new Array(width * height).fill(0)],
    durations: [500],
    createdAt: Date.now(),
  };
}

// Device uses 8bpp indexed color: one byte per pixel, value = palette index (0-15).
// Confirmed from original app's getFrameBytes() in mod 747 which returns one index per pixel.
export function frameToBytes(pixels: number[]): number[] {
  return pixels.map(idx => idx & 0x0f);
}

// Converts 16 hex palette entries to flat RGB byte array for OPCODE_SET_PALETTE.
export function paletteTo3BytesRGB(palette: string[]): number[] {
  const bytes: number[] = [];
  for (const hex of palette) {
    const n = parseInt(hex.replace('#', ''), 16);
    bytes.push((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
  }
  return bytes;
}

// Frame duration list → flat uint16 LE byte array for OPCODE_SET_FRAMES_DURATIONS.
export function durationsToBytes(durations: number[]): number[] {
  const bytes: number[] = [];
  for (const ms of durations) {
    bytes.push(ms & 0xff, (ms >> 8) & 0xff);
  }
  return bytes;
}

export const DEFAULT_PALETTE: string[] = [
  '#000000', // 0  black
  '#ff0000', // 1  red
  '#00ff00', // 2  green
  '#0000ff', // 3  blue
  '#ffff00', // 4  yellow
  '#ff00ff', // 5  magenta
  '#00ffff', // 6  cyan
  '#ffffff', // 7  white
  '#ff8000', // 8  orange
  '#8000ff', // 9  purple
  '#00ff80', // 10 lime
  '#ff0080', // 11 pink
  '#0080ff', // 12 sky blue
  '#80ff00', // 13 yellow-green
  '#ff8080', // 14 light red
  '#8080ff', // 15 periwinkle
];
