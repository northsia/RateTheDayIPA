import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as SQLite from 'expo-sqlite';
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  LayoutChangeEvent,
} from 'react-native';
import Home from './Home';
import Settings from './Settings';
import Dock, { Tab } from './Dock';
import { ThemeProvider, useTheme } from './Theme';

type Screen = 'loading' | 'intro' | 'main';

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

function Root() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [tab, setTab] = useState<Tab>('home');
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);

  const loginSound = useAudioPlayer(require('./assets/put.wav'));

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (screen === 'main') {
      try {
        loginSound.seekTo(0);
        loginSound.play();
      } catch (e) {
        console.log('Audio error', e);
      }
    }
  }, [screen]);

  useEffect(() => {
    (async () => {
      try {
        const db = await SQLite.openDatabaseAsync('ratetheday.db');
        dbRef.current = db;

        await db.execAsync(
          'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT);'
        );

        const row = await db.getFirstAsync<{ value: string }>(
          'SELECT value FROM settings WHERE key = ?',
          ['onboarded']
        );

        setScreen(row?.value === '1' ? 'main' : 'intro');
      } catch (e) {
        console.log('DB error', e);
        setScreen('intro');
      }
    })();
  }, []);

  const handleStart = async () => {
    try {
      await dbRef.current?.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['onboarded', '1']
      );
    } catch (e) {
      console.log('DB write error', e);
    }
    setScreen('main');
  };

  // Black screen while the DB is read, so the intro never flashes
  if (screen === 'loading') {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
      </View>
    );
  }

  if (screen === 'main') {
    return (
      <View style={styles.root}>
        {tab === 'home' ? <Home /> : <Settings />}
        <Dock tab={tab} onChange={setTab} />
      </View>
    );
  }

  return <Intro onStart={handleStart} />;
}

function Intro({ onStart }: { onStart: () => void }) {
  const { accent } = useTheme();
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const [buttonWidth, setButtonWidth] = useState<number>(300);

  useEffect(() => {
    const fadeIn = (value: Animated.Value) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

    Animated.stagger(180, [
      fadeIn(titleAnim),
      fadeIn(subtitleAnim),
      fadeIn(buttonAnim),
    ]).start();

    // Glass shine sweep across the button, repeating
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(2800),
      ])
    );
    shineLoop.start();

    return () => shineLoop.stop();
  }, []);

  const translateFor = (value: Animated.Value, distance: number) =>
    value.interpolate({
      inputRange: [0, 1],
      outputRange: [distance, 0],
    });

  const titleStyle = {
    opacity: titleAnim,
    transform: [{ translateY: translateFor(titleAnim, 24) }],
  };

  const subtitleStyle = {
    opacity: subtitleAnim,
    transform: [{ translateY: translateFor(subtitleAnim, 24) }],
  };

  const buttonStyle = {
    opacity: buttonAnim,
    transform: [
      { translateY: translateFor(buttonAnim, 32) },
      { scale: pressAnim },
    ],
  };

  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, buttonWidth + 80],
  });

  const handlePressIn = () =>
    Animated.spring(pressAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();

  const handlePressOut = () =>
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();

  const handleLayout = (e: LayoutChangeEvent) =>
    setButtonWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Animated.Text style={[styles.title, titleStyle]}>
        Welcome to Ratetheday.
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        Rate your day and see how your mood changes over time. Press the button below to get started!
      </Animated.Text>

      <Animated.View style={buttonStyle}>
        <Pressable
          style={[styles.button, { backgroundColor: accent }]}
          onLayout={handleLayout}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onStart}
        >
          <Text style={styles.buttonText}>Get Started</Text>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.shine,
              { transform: [{ translateX: shineTranslate }, { rotate: '20deg' }] },
            ]}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    color: '#888',
    fontSize: 15,
    marginBottom: 35,
  },
  button: {
    paddingHorizontal: 102,
    paddingVertical: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  buttonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  shine: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});