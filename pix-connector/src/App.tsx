import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { DeviceListScreen } from './screens/DeviceListScreen';
import { ControlScreen, NavigateTo } from './screens/ControlScreen';
import { BikeScreen } from './screens/BikeScreen';
import { PixelBreakerScreen } from './screens/PixelBreakerScreen';
import { AnimationEditorScreen } from './screens/AnimationEditorScreen';
import { ScrollingTextScreen } from './screens/ScrollingTextScreen';
import type { Backpack } from './ble/Backpack';

type AppScreen = 'devices' | 'control' | 'bike' | 'pixel-breaker' | 'animation-editor' | 'scrolling-text';

export default function App() {
  const [device, setDevice] = useState<Backpack | null>(null);
  const [screen, setScreen] = useState<AppScreen>('devices');

  function connectDevice(d: Backpack) {
    setDevice(d);
    setScreen('control');
  }

  function disconnect() {
    setDevice(null);
    setScreen('devices');
  }

  function navigate(to: NavigateTo) {
    setScreen(to);
  }

  function goBack() {
    setScreen('control');
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {screen === 'devices' && (
        <DeviceListScreen onDeviceSelected={connectDevice} />
      )}

      {screen === 'control' && device && (
        <ControlScreen
          device={device}
          onDisconnect={disconnect}
          onNavigate={navigate}
        />
      )}

      {screen === 'bike' && device && (
        <BikeScreen device={device} onBack={goBack} />
      )}

      {screen === 'pixel-breaker' && device && (
        <PixelBreakerScreen device={device} onBack={goBack} />
      )}

      {screen === 'animation-editor' && device && (
        <AnimationEditorScreen device={device} onBack={goBack} />
      )}

      {screen === 'scrolling-text' && device && (
        <ScrollingTextScreen device={device} onBack={goBack} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
});
