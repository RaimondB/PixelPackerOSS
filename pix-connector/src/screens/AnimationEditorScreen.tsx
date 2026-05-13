import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Alert,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Backpack } from '../ble/Backpack';
import { MODE_ANIMATION } from '../ble/constants';
import {
  AnimationStore,
  SavedAnimation,
  durationsToBytes,
  frameToBytes,
  newAnimation,
  paletteTo3BytesRGB,
} from '../storage/AnimationStore';
import { BUILTIN_ANIMATIONS } from '../data/builtinAnimations';

interface Props {
  device: Backpack;
  onBack: () => void;
  existingId?: string;
}

const SCREEN_W = Dimensions.get('window').width;

export function AnimationEditorScreen({ device, onBack, existingId }: Props) {
  const [anim, setAnim] = useState<SavedAnimation>(() => newAnimation(16, 20));
  const [devSize, setDevSize] = useState({ w: 16, h: 20 });
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [selectedColor, setSelectedColor] = useState(1);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [savedList, setSavedList] = useState<SavedAnimation[]>([]);
  const [showList, setShowList] = useState(false);

  // Refs used inside the PanResponder closure (avoids stale captures)
  const animRef = useRef(anim);
  const selFrameRef = useRef(selectedFrame);
  const selColorRef = useRef(selectedColor);
  const gridOrigin = useRef({ x: 0, y: 0 });
  const gridRef = useRef<View>(null);

  useEffect(() => { animRef.current = anim; }, [anim]);
  useEffect(() => { selFrameRef.current = selectedFrame; }, [selectedFrame]);
  useEffect(() => { selColorRef.current = selectedColor; }, [selectedColor]);

  // Cell size based on device width
  const cellSize = useMemo(
    () => Math.max(4, Math.floor((SCREEN_W - 32) / devSize.w)),
    [devSize.w],
  );
  const cellSizeRef = useRef(cellSize);
  useEffect(() => { cellSizeRef.current = cellSize; }, [cellSize]);

  // Read actual device dimensions on mount
  useEffect(() => {
    Promise.all([device.readWidth(), device.readHeight()]).then(([w, h]) => {
      setDevSize({ w, h });
      if (!existingId) {
        setAnim(newAnimation(w, h));
      }
    }).catch(() => {}); // stay with defaults if read fails
  }, [device, existingId]);

  // Load existing animation
  useEffect(() => {
    if (existingId) {
      AnimationStore.get(existingId).then(a => {
        if (a) { setAnim(a); setSelectedFrame(0); }
      });
    }
  }, [existingId]);

  // Load saved list when list view opens
  useEffect(() => {
    if (showList) AnimationStore.list().then(setSavedList);
  }, [showList]);

  // ── PanResponder ────────────────────────────────────────────────────────────
  // Created once ([] deps); all mutable state accessed via refs.
  const doPaint = useCallback((pageX: number, pageY: number) => {
    const cs = cellSizeRef.current;
    const a = animRef.current;
    const col = Math.floor((pageX - gridOrigin.current.x) / cs);
    const row = Math.floor((pageY - gridOrigin.current.y) / cs);
    if (col < 0 || col >= a.width || row < 0 || row >= a.height) return;
    const idx = row * a.width + col;
    const colorIdx = selColorRef.current;
    setAnim(prev => {
      const fi = selFrameRef.current;
      if ((prev.frames[fi] ?? [])[idx] === colorIdx) return prev;
      const frames = prev.frames.map((f, i) => {
        if (i !== fi) return f;
        const next = [...f];
        next[idx] = colorIdx;
        return next;
      });
      return { ...prev, frames };
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Re-measure position on each touch start so scroll-offset is always correct
      onPanResponderGrant: evt => {
        const { pageX, pageY } = evt.nativeEvent;
        gridRef.current?.measure((_x, _y, _w, _h, gPageX, gPageY) => {
          gridOrigin.current = { x: gPageX, y: gPageY };
          doPaintRef.current(pageX, pageY);
        });
      },
      onPanResponderMove: evt =>
        doPaintRef.current(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
    }),
  ).current;

  // Ref wrapper so the PanResponder closure can call latest doPaint
  const doPaintRef = useRef(doPaint);
  useEffect(() => { doPaintRef.current = doPaint; }, [doPaint]);

  const measureGrid = useCallback(() => {
    gridRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      gridOrigin.current = { x: pageX, y: pageY };
    });
  }, []);

  // ── Frame management ────────────────────────────────────────────────────────
  const addFrame = useCallback(() => {
    setAnim(prev => ({
      ...prev,
      frames: [...prev.frames, new Array(prev.width * prev.height).fill(0)],
      durations: [...prev.durations, 500],
    }));
    setSelectedFrame(f => f + 1);
  }, []);

  const duplicateFrame = useCallback(() => {
    setAnim(prev => {
      const fi = selFrameRef.current;
      const copy = [...(prev.frames[fi] ?? [])];
      const newFrames = [...prev.frames];
      newFrames.splice(fi + 1, 0, copy);
      const newDurations = [...prev.durations];
      newDurations.splice(fi + 1, 0, prev.durations[fi] ?? 500);
      return { ...prev, frames: newFrames, durations: newDurations };
    });
    setSelectedFrame(f => f + 1);
  }, []);

  const removeFrame = useCallback(() => {
    if (animRef.current.frames.length <= 1) {
      Alert.alert('Cannot remove', 'At least one frame is required.');
      return;
    }
    setAnim(prev => ({
      ...prev,
      frames: prev.frames.filter((_, i) => i !== selFrameRef.current),
      durations: prev.durations.filter((_, i) => i !== selFrameRef.current),
    }));
    setSelectedFrame(f => Math.max(0, f - 1));
  }, []);

  const clearFrame = useCallback(() => {
    setAnim(prev => ({
      ...prev,
      frames: prev.frames.map((f, i) =>
        i === selFrameRef.current ? new Array(prev.width * prev.height).fill(0) : f,
      ),
    }));
  }, []);

  const setDuration = useCallback((ms: number) => {
    setAnim(prev => {
      const newDurations = [...prev.durations];
      newDurations[selFrameRef.current] = ms;
      return { ...prev, durations: newDurations };
    });
  }, []);

  // ── Persistence / upload ────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setBusy(true);
    try {
      await AnimationStore.save(animRef.current);
      setStatus('Saved.');
    } catch (e: any) {
      setStatus(`Save failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    const a = animRef.current;
    setBusy(true);
    setStatus('Uploading…');
    try {
      // Sequence from original app (mod 739):
      // clearScreen → resetFrameCount → palette → frames → durations → direction → setFrameCount → save
      await device.setRenderModeNone();
      await device.setFrameCount(0);                              // reset: erase previous animation
      await device.setPalette(paletteTo3BytesRGB(a.palette), 0);
      for (let i = 0; i < a.frames.length; i++) {
        setStatus(`Uploading frame ${i + 1}/${a.frames.length}…`);
        await device.setFrame(i, frameToBytes(a.frames[i]));     // 8bpp: one byte per palette index
      }
      await device.setFrameDurations(durationsToBytes(a.durations));
      await device.setAnimationDirection(0);                      // 0 = normal
      await device.setFrameCount(a.frames.length);                // set actual count last
      await device.saveAnimationToPersistentMemory();
      await device.setRenderMode(MODE_ANIMATION);
      setStatus('Uploaded!');
    } catch (e: any) {
      setStatus(`Upload failed: ${e.message}`);
      Alert.alert('Upload failed', e.message);
    } finally {
      setBusy(false);
    }
  }, [device]);

  // ── Saved list view ─────────────────────────────────────────────────────────
  if (showList) {
    return (
      <SavedListView
        list={savedList}
        builtins={BUILTIN_ANIMATIONS}
        onLoad={id => {
          const builtin = BUILTIN_ANIMATIONS.find(a => a.id === id);
          if (builtin) {
            setAnim(builtin);
            setSelectedFrame(0);
          } else {
            AnimationStore.get(id).then(a => {
              if (a) { setAnim(a); setSelectedFrame(0); }
            });
          }
          setShowList(false);
        }}
        onDelete={async id => {
          await AnimationStore.delete(id);
          setSavedList(l => l.filter(a => a.id !== id));
        }}
        onClose={() => setShowList(false)}
      />
    );
  }

  const currentPixels = anim.frames[selectedFrame] ?? [];
  const gridW = cellSize * anim.width;
  const gridH = cellSize * anim.height;

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.nameInput}
          value={anim.name}
          onChangeText={name => setAnim(prev => ({ ...prev, name }))}
          placeholder="Animation name"
          placeholderTextColor="#555"
        />
      </View>

      {/* ── Action bar ── */}
      <View style={styles.actionRow}>
        <Btn label="Load" onPress={() => setShowList(true)} />
        <Btn label="Save" onPress={handleSave} disabled={busy} primary />
        <Btn label={busy ? 'Working…' : 'Upload'} onPress={handleUpload} disabled={busy} primary />
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {/* ── Palette (horizontal, always visible, above grid) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.paletteScroll}
        contentContainerStyle={styles.paletteContent}
      >
        {anim.palette.map((hex, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.paletteCell,
              { backgroundColor: hex },
              i === selectedColor && styles.paletteCellActive,
            ]}
            onPress={() => setSelectedColor(i)}
          />
        ))}
      </ScrollView>

      {/* ── Pixel grid — NOT inside a ScrollView to avoid coordinate drift ── */}
      <View style={styles.gridWrapper}>
        <View
          ref={gridRef}
          onLayout={measureGrid}
          style={[styles.grid, { width: gridW, height: gridH }]}
          {...panResponder.panHandlers}
        >
          {currentPixels.map((colorIdx, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: (i % anim.width) * cellSize,
                top: Math.floor(i / anim.width) * cellSize,
                width: cellSize,
                height: cellSize,
                backgroundColor: anim.palette[colorIdx] ?? '#000',
                borderWidth: 0.5,
                borderColor: '#1a1a1a',
              }}
            />
          ))}
        </View>
      </View>

      {/* ── Frame controls (scrollable, below grid) ── */}
      <ScrollView style={styles.controls} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>
          Frame {selectedFrame + 1} / {anim.frames.length}
          {'  '}·{'  '}{anim.width}×{anim.height}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {anim.frames.map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.frameThumb, i === selectedFrame && styles.frameThumbActive]}
              onPress={() => setSelectedFrame(i)}
            >
              <Text style={styles.frameThumbText}>{i + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.frameActions}>
          <Btn label="+ Add" onPress={addFrame} />
          <Btn label="Dup" onPress={duplicateFrame} />
          <Btn label="Clear" onPress={clearFrame} />
          <Btn label="− Del" onPress={removeFrame} danger />
        </View>

        <View style={styles.durationRow}>
          <Text style={styles.durationLabel}>Duration (ms):</Text>
          <TextInput
            style={styles.durationInput}
            keyboardType="numeric"
            value={String(anim.durations[selectedFrame] ?? 500)}
            onChangeText={v => {
              const ms = parseInt(v, 10);
              if (!isNaN(ms) && ms > 0) setDuration(ms);
            }}
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

// ── Saved list view ────────────────────────────────────────────────────────────

function SavedListView({
  list, builtins, onLoad, onDelete, onClose,
}: {
  list: SavedAnimation[];
  builtins: SavedAnimation[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  function AnimRow({ a, deletable }: { a: SavedAnimation; deletable: boolean }) {
    return (
      <View style={styles.listItem}>
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemName}>{a.name}</Text>
          <Text style={styles.listItemMeta}>
            {a.width}×{a.height} · {a.frames.length} frame{a.frames.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.listBtn} onPress={() => onLoad(a.id)}>
          <Text style={styles.listBtnText}>Load</Text>
        </TouchableOpacity>
        {deletable && (
          <TouchableOpacity
            style={[styles.listBtn, styles.listBtnDanger]}
            onPress={() => Alert.alert('Delete', `Delete "${a.name}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(a.id) },
            ])}
          >
            <Text style={styles.listBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.listTitle}>Animations</Text>
      </View>
      <ScrollView>
        <Text style={styles.listSection}>Built-in</Text>
        {builtins.map(a => <AnimRow key={a.id} a={a} deletable={false} />)}
        <Text style={styles.listSection}>Saved</Text>
        {list.length === 0 && (
          <Text style={styles.emptyText}>No saved animations yet.</Text>
        )}
        {list.map(a => <AnimRow key={a.id} a={a} deletable={true} />)}
      </ScrollView>
    </View>
  );
}

// ── Shared button ──────────────────────────────────────────────────────────────

function Btn({
  label, onPress, disabled, primary, danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        primary && styles.btnPrimary,
        danger && styles.btnDanger,
        disabled && styles.btnDisabled,
      ]}
    >
      <Text style={[styles.btnText, (primary || danger) && styles.btnTextDark]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: '#0a0a0a' },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  backBtn:           { paddingRight: 10, paddingVertical: 6 },
  backText:          { color: '#00d4ff', fontSize: 15 },
  nameInput:         { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700', borderBottomWidth: 1, borderColor: '#333', paddingVertical: 3 },
  actionRow:         { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 4 },
  status:            { color: '#00d4ff', fontSize: 11, paddingHorizontal: 12, marginBottom: 2 },
  paletteScroll:     { maxHeight: 52, marginBottom: 6 },
  paletteContent:    { paddingHorizontal: 12, gap: 6, flexDirection: 'row', alignItems: 'center' },
  paletteCell:       { width: 38, height: 38, borderRadius: 6, borderWidth: 2, borderColor: 'transparent' },
  paletteCellActive: { borderColor: '#fff', borderWidth: 3 },
  gridWrapper:       { alignItems: 'center', justifyContent: 'center' },
  grid:              { position: 'relative' },
  controls:          { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  sectionLabel:      { color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  frameThumb:        { width: 40, height: 40, backgroundColor: '#1e1e1e', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6, borderWidth: 1, borderColor: '#333' },
  frameThumbActive:  { borderColor: '#00d4ff', borderWidth: 2 },
  frameThumbText:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  frameActions:      { flexDirection: 'row', gap: 8, marginTop: 8 },
  durationRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  durationLabel:     { color: '#888', fontSize: 13 },
  durationInput:     { color: '#fff', fontSize: 15, borderBottomWidth: 1, borderColor: '#333', minWidth: 70, paddingVertical: 2 },
  btn:               { backgroundColor: '#1e1e1e', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  btnPrimary:        { backgroundColor: '#00d4ff', borderColor: '#00d4ff' },
  btnDanger:         { backgroundColor: '#c0392b', borderColor: '#c0392b' },
  btnDisabled:       { opacity: 0.4 },
  btnText:           { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnTextDark:       { color: '#000' },
  // List
  listTitle:         { color: '#fff', fontSize: 19, fontWeight: '700' },
  listSection:       { color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  emptyText:         { color: '#555', textAlign: 'center', marginTop: 48, fontSize: 14 },
  listItem:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#1e1e1e' },
  listItemInfo:      { flex: 1 },
  listItemName:      { color: '#fff', fontSize: 15, fontWeight: '600' },
  listItemMeta:      { color: '#666', fontSize: 11, marginTop: 2 },
  listBtn:           { backgroundColor: '#1e1e1e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 6, borderWidth: 1, borderColor: '#333' },
  listBtnDanger:     { borderColor: '#c0392b' },
  listBtnText:       { color: '#fff', fontWeight: '600', fontSize: 13 },
});
