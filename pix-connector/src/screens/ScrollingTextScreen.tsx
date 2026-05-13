import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import type { Backpack } from '../ble/Backpack';
import { MODE_SCROLLING } from '../ble/constants';
import { charToFrameBytes, isCharSupported } from '../ble/font';
import { toUint16Bytes } from '../ble/utils';

interface Props {
  device: Backpack;
  onBack: () => void;
}

const COLOR_PRESETS = [
  { label: 'White',   hex: '#ffffff', rgb: [255, 255, 255] },
  { label: 'Red',     hex: '#ff0000', rgb: [255, 0, 0] },
  { label: 'Green',   hex: '#00ff00', rgb: [0, 255, 0] },
  { label: 'Blue',    hex: '#0088ff', rgb: [0, 136, 255] },
  { label: 'Yellow',  hex: '#ffff00', rgb: [255, 255, 0] },
  { label: 'Cyan',    hex: '#00ffff', rgb: [0, 255, 255] },
  { label: 'Orange',  hex: '#ff8000', rgb: [255, 128, 0] },
  { label: 'Pink',    hex: '#ff00ff', rgb: [255, 0, 255] },
];

const SPEED_PRESETS = [
  { label: 'Slow',   ms: 120 },
  { label: 'Normal', ms: 80 },
  { label: 'Fast',   ms: 50 },
  { label: 'Turbo',  ms: 30 },
];

export function ScrollingTextScreen({ device, onBack }: Props) {
  const [text, setText] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const filteredText = text.split('').filter(isCharSupported).join('');
  const fullText = ' ' + filteredText; // leading space per original widget
  const uniqueChars = Array.from(new Set(fullText.split(''))).sort((a, b) => a.localeCompare(b));
  const frameSequence = fullText.split('').map(ch => uniqueChars.indexOf(ch));

  const upload = useCallback(async () => {
    if (!filteredText) {
      Alert.alert('Empty text', 'Enter some text to scroll.');
      return;
    }

    const color = COLOR_PRESETS[colorIdx];
    const speed = SPEED_PRESETS[speedIdx].ms;
    const [speed_lo, speed_hi] = toUint16Bytes(speed);
    const [seq_lo, seq_hi] = toUint16Bytes(frameSequence.length);

    setBusy(true);
    setStatus('Uploading scrolling text…');
    try {
      // 1. Clear + reset
      await device.setRenderModeNone();
      await device.setFrameCount(0);

      // 2. Palette: black (bg) + text color
      const paletteBytes = [0, 0, 0, ...color.rgb];
      await device.setPalette(paletteBytes, 0);

      // 3. Upload one frame per unique character
      for (let i = 0; i < uniqueChars.length; i++) {
        const ch = uniqueChars[i];
        const frameBytes = charToFrameBytes(ch);
        if (!frameBytes) continue;
        setStatus(`Uploading char ${i + 1}/${uniqueChars.length} ('${ch}')…`);
        await device.setFrame(i, frameBytes);
      }

      // 4. Set render mode with scrolling config + char sequence
      const configBytes = [
        MODE_SCROLLING,
        0,            // SCROLLING_DIRECTION_LEFT
        speed_lo, speed_hi,
        8,            // CHAR_WIDTH
        20,           // CHAR_HEIGHT
        seq_lo, seq_hi,
        ...frameSequence,
      ];
      setStatus('Setting render mode…');
      await device.setRenderMode(configBytes);

      // 5. Set frame count last
      await device.setFrameCount(uniqueChars.length);

      setStatus(`Scrolling "${filteredText}" at ${speed}ms/char.`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
      Alert.alert('Upload error', err.message);
    } finally {
      setBusy(false);
    }
  }, [device, filteredText, uniqueChars, frameSequence, colorIdx, speedIdx]);

  const unsupportedChars = text.split('').filter(ch => !isCharSupported(ch));

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scrolling Text</Text>
      </View>

      <Text style={styles.label}>Message</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type your message…"
        placeholderTextColor="#555"
        maxLength={200}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {unsupportedChars.length > 0 && (
        <Text style={styles.warn}>
          Unsupported chars (removed): {[...new Set(unsupportedChars)].join(' ')}
        </Text>
      )}
      {filteredText.length > 0 && (
        <Text style={styles.preview}>Will send: "{filteredText}" ({uniqueChars.length} unique chars)</Text>
      )}

      <Text style={styles.label}>Color</Text>
      <View style={styles.colorRow}>
        {COLOR_PRESETS.map((c, i) => (
          <TouchableOpacity
            key={c.hex}
            style={[styles.colorBtn, { backgroundColor: c.hex }, colorIdx === i && styles.colorBtnActive]}
            onPress={() => setColorIdx(i)}
          >
            {colorIdx === i && <Text style={styles.colorCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Speed</Text>
      <View style={styles.speedRow}>
        {SPEED_PRESETS.map((s, i) => (
          <TouchableOpacity
            key={s.label}
            style={[styles.speedBtn, speedIdx === i && styles.speedBtnActive]}
            onPress={() => setSpeedIdx(i)}
          >
            <Text style={[styles.speedText, speedIdx === i && styles.speedTextActive]}>{s.label}</Text>
            <Text style={styles.speedMs}>{s.ms}ms</Text>
          </TouchableOpacity>
        ))}
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {busy && <ActivityIndicator color="#00d4ff" style={{ marginTop: 8 }} />}

      <TouchableOpacity
        style={[styles.uploadBtn, (busy || !filteredText) && styles.uploadBtnDisabled]}
        onPress={upload}
        disabled={busy || !filteredText}
      >
        <Text style={styles.uploadText}>{busy ? 'Uploading…' : 'Send to Backpack'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:            { flex: 1, backgroundColor: '#0a0a0a' },
  container:         { padding: 20, paddingBottom: 48 },
  header:            { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn:           { paddingRight: 16, paddingVertical: 8 },
  backText:          { color: '#00d4ff', fontSize: 16 },
  title:             { color: '#fff', fontSize: 22, fontWeight: '700' },
  label:             { color: '#888', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 },
  input:             { backgroundColor: '#1e1e1e', borderRadius: 8, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#333' },
  warn:              { color: '#ff9900', fontSize: 12, marginTop: 6 },
  preview:           { color: '#555', fontSize: 12, marginTop: 6 },
  colorRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorBtn:          { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive:    { borderColor: '#fff', borderWidth: 3 },
  colorCheck:        { color: '#000', fontSize: 18, fontWeight: '900' },
  speedRow:          { flexDirection: 'row', gap: 8 },
  speedBtn:          { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  speedBtnActive:    { borderColor: '#00d4ff', borderWidth: 2 },
  speedText:         { color: '#fff', fontWeight: '600', fontSize: 13 },
  speedTextActive:   { color: '#00d4ff' },
  speedMs:           { color: '#555', fontSize: 11, marginTop: 2 },
  status:            { color: '#00d4ff', fontSize: 13, marginTop: 16, textAlign: 'center' },
  uploadBtn:         { backgroundColor: '#00d4ff', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  uploadBtnDisabled: { opacity: 0.4 },
  uploadText:        { color: '#000', fontWeight: '800', fontSize: 16 },
});
