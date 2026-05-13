import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import type { Backpack } from '../ble/Backpack';
import { MODE_ANIMATION } from '../ble/constants';
import { ROLLING, COMBINATIONS, BUILTIN_PALETTE } from '../data/builtinAnimations';
import { paletteTo3BytesRGB, durationsToBytes } from '../storage/AnimationStore';

interface Props {
  device: Backpack;
  onBack: () => void;
}

// Mirrors mod_0737: ROLLING (37) + 6 black frames + 1 random outcome, once (NORMAL_STOP).
const FRAME_MS = 100;
const BLACK_FRAME_COUNT = 6;
const BLACK_FRAME = new Array(ROLLING.width * ROLLING.height).fill(0);
const PALETTE_BYTES = paletteTo3BytesRGB(BUILTIN_PALETTE);
const OUTCOME_FRAME_IDX = ROLLING.frames.length + BLACK_FRAME_COUNT; // 43
const TOTAL_FRAMES = OUTCOME_FRAME_IDX + 1; // 44
const DURATION_BYTES = durationsToBytes(new Array(TOTAL_FRAMES).fill(FRAME_MS));

export function DiceScreen({ device, onBack }: Props) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  // Once primed, only the outcome frame needs replacing on re-roll.
  const primed = useRef(false);

  const roll = useCallback(async () => {
    const comboIdx = Math.floor(Math.random() * COMBINATIONS.length);
    const outcomeFrame = COMBINATIONS[comboIdx];

    setBusy(true);
    try {
      if (!primed.current) {
        // ── First roll: full upload ────────────────────────────────────────
        const allFrames = [
          ...ROLLING.frames,
          ...Array(BLACK_FRAME_COUNT).fill(BLACK_FRAME),
          outcomeFrame,
        ];

        setStatus('Setting up…');
        await device.setRenderModeNone();
        await device.setFrameCount(0);
        await device.setPalette(PALETTE_BYTES, 0);

        for (let i = 0; i < allFrames.length; i++) {
          if (i % 5 === 0) {
            setStatus(`Uploading ${i + 1}/${TOTAL_FRAMES}…`);
          }
          await device.setFrame(i, allFrames[i]);
        }

        await device.setFrameDurations(DURATION_BYTES);
        await device.setAnimationDirection(2); // NORMAL_STOP — play once
        await device.setFrameCount(TOTAL_FRAMES);
        // No saveAnimationToPersistentMemory — dice roll is transient (matches original)
        await device.setRenderMode(MODE_ANIMATION);

        primed.current = true;
      } else {
        // ── Re-roll: replace only the outcome frame then restart ───────────
        setStatus('Re-rolling…');
        await device.setFrame(OUTCOME_FRAME_IDX, outcomeFrame);
        await device.setRenderModeNone();
        await device.setRenderMode(MODE_ANIMATION);
      }

      setStatus('Rolling…');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      primed.current = false; // force full re-upload next time
    } finally {
      setBusy(false);
    }
  }, [device]);

  const rollDurationSec = (TOTAL_FRAMES * FRAME_MS / 1000).toFixed(1);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Roll the Dice</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.diceIcon}>🎲</Text>

        <Text style={styles.description}>
          Plays a {ROLLING.frames.length}-frame rolling animation then freezes
          on a random result. {COMBINATIONS.length} possible outcomes.
        </Text>
        <Text style={styles.duration}>~{rollDurationSec}s · plays once on backpack</Text>

        {status ? <Text style={styles.status}>{status}</Text> : null}
        {busy && <ActivityIndicator color="#ffa500" style={{ marginTop: 8 }} />}

        <TouchableOpacity
          style={[styles.rollBtn, busy && styles.rollBtnDisabled]}
          onPress={roll}
          disabled={busy}
          activeOpacity={0.75}
        >
          <Text style={styles.rollText}>{busy ? 'Rolling…' : 'Roll!'}</Text>
        </TouchableOpacity>

        {primed.current && !busy && (
          <Text style={styles.hint}>Tap again to re-roll instantly</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#0a0a0a', padding: 16 },
  header:          { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn:         { paddingRight: 16, paddingVertical: 8 },
  backText:        { color: '#00d4ff', fontSize: 16 },
  title:           { color: '#fff', fontSize: 22, fontWeight: '700' },
  body:            { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  diceIcon:        { fontSize: 80 },
  description:     { color: '#888', fontSize: 14, textAlign: 'center', maxWidth: 280 },
  duration:        { color: '#555', fontSize: 12 },
  status:          { color: '#ffa500', fontSize: 13, textAlign: 'center' },
  rollBtn:         { marginTop: 8, backgroundColor: '#ffa500', borderRadius: 16, paddingHorizontal: 56, paddingVertical: 20 },
  rollBtnDisabled: { opacity: 0.4 },
  rollText:        { color: '#000', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  hint:            { color: '#444', fontSize: 12 },
});
