import { Alert } from 'react-native';
import RNFS from 'react-native-fs';
import RNShare from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';
import { AnimationStore, SavedAnimation } from './AnimationStore';

// ── Versioned backup format ────────────────────────────────────────────────────
//
// Every backup file is a JSON object with a top-level `version` integer.
// When adding a new storage shape, increment CURRENT_VERSION, add a new
// interface below, extend the BackupFile union, and add a case to `migrate()`.
// Old files always stay readable — the migration chain converts them forward.

const CURRENT_VERSION = 1;

interface BackupV1 {
  version: 1;
  app: 'PixelPacker OSS';
  exportedAt: string;        // ISO-8601
  animations: SavedAnimation[];
}

// Extend this union when adding v2, v3, …
type BackupFile = BackupV1;

// ── Migrations ─────────────────────────────────────────────────────────────────
// Each function receives the raw parsed data for its version and returns the
// normalized SavedAnimation[] that the current app understands.

function migrateV1(data: BackupV1): SavedAnimation[] {
  // v1 is the current shape — no transformation needed.
  return data.animations.map(a => ({
    ...a,
    // Guarantee optional fields introduced after v1 have defaults
    animationDirection: a.animationDirection ?? 0,
  }));
}

// Parse any supported backup version and return a normalized animation list.
function parseBackup(raw: string): SavedAnimation[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || !('version' in parsed)) {
    throw new Error('Unrecognised backup format (missing version field).');
  }
  const { version } = parsed as { version: unknown };
  if (typeof version !== 'number') {
    throw new Error('Unrecognised backup format (version must be a number).');
  }

  switch (version as number) {
    case 1: return migrateV1(parsed as BackupV1);
    // case 2: return migrateV2(parsed as BackupV2);
    default:
      throw new Error(
        `Backup version ${version} is newer than this app supports (max v${CURRENT_VERSION}). Please update PixelPacker.`,
      );
  }
}

// ── Export ─────────────────────────────────────────────────────────────────────

function buildBackupJson(): Promise<string> {
  return AnimationStore.list().then(animations => {
    const backup: BackupV1 = {
      version: 1,
      app: 'PixelPacker OSS',
      exportedAt: new Date().toISOString(),
      animations,
    };
    return JSON.stringify(backup, null, 2);
  });
}

function backupFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `pixelpacker-backup-${date}.json`;
}

async function writeToCacheDir(json: string): Promise<string> {
  const path = `${RNFS.CachesDirectoryPath}/${backupFilename()}`;
  await RNFS.writeFile(path, json, 'utf8');
  return path;
}

async function writeToExternalDir(json: string): Promise<void> {
  const path = `${RNFS.ExternalDirectoryPath}/${backupFilename()}`;
  await RNFS.writeFile(path, json, 'utf8');
}

// Writes a backup file and opens the Android share sheet so the user can send
// it to Google Drive, email, Bluetooth, etc. The share sheet sees a proper
// .json file with a clean filename (not raw text content).
export async function shareBackup(): Promise<void> {
  const json = await buildBackupJson();
  const path = await writeToCacheDir(json);
  // Also persist to external app dir for power users with a file manager.
  try { await writeToExternalDir(json); } catch (_) {}
  await RNShare.open({
    url: `file://${path}`,
    type: 'application/json',
    filename: backupFilename(),
    failOnCancel: false,
  });
}

// ── Import ─────────────────────────────────────────────────────────────────────

async function readPickedFile(uri: string, copyUri: string | null): Promise<string> {
  // react-native-document-picker copyTo:'cachesDirectory' gives a reliable
  // file:// URI; fall back to fetch() for content:// URIs.
  const readable = copyUri ?? uri;
  try {
    return await RNFS.readFile(readable, 'utf8');
  } catch {
    const response = await fetch(readable);
    return response.text();
  }
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  imported: number;
  skipped: number;
}

// Opens the system file picker, reads the chosen file, validates its version,
// then saves animations to the local store.
export async function pickAndImport(mode: ImportMode): Promise<ImportResult> {
  const result = await DocumentPicker.pickSingle({
    type: [DocumentPicker.types.allFiles],
    // Copy to app cache so RNFS can read content:// URIs from Google Drive etc.
    copyTo: 'cachesDirectory',
  });

  const raw = await readPickedFile(result.uri, result.fileCopyUri ?? null);
  const incoming = parseBackup(raw);

  if (mode === 'replace') {
    const existing = await AnimationStore.list();
    for (const a of existing) await AnimationStore.delete(a.id);
  }

  const existing = await AnimationStore.list();
  const existingIds = new Set(existing.map(a => a.id));
  let imported = 0;
  let skipped = 0;

  for (const anim of incoming) {
    if (mode === 'merge' && existingIds.has(anim.id)) {
      skipped++;
      continue;
    }
    await AnimationStore.save(anim);
    imported++;
  }

  return { imported, skipped };
}

// Convenience wrapper that shows alerts for the happy / error paths.
export async function importWithAlerts(mode: ImportMode): Promise<void> {
  try {
    const { imported, skipped } = await pickAndImport(mode);
    const msg = mode === 'merge'
      ? `Imported ${imported} animation${imported !== 1 ? 's' : ''}${skipped > 0 ? `, skipped ${skipped} already present` : ''}.`
      : `Restored ${imported} animation${imported !== 1 ? 's' : ''}.`;
    Alert.alert('Import complete', msg);
  } catch (err: any) {
    if (DocumentPicker.isCancel(err)) return; // user cancelled — silent
    Alert.alert('Import failed', err.message);
  }
}
