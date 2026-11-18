import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SQLite from 'expo-sqlite';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Chart, { DayRating } from './Chart';

const NEON = '#15ff00';

type Range = 7 | 30 | 'all';
const RANGES: { key: Range; label: string }[] = [
  { key: 7, label: '7D' },
  { key: 30, label: '30D' },
  { key: 'all', label: 'ALL' },
];

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

// last n days, oldest first, today last
const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return fmt(d);
  });

// every day from `first` to today
const daysFrom = (first: string) => {
  const out: string[] = [];
  const d = new Date(first + 'T00:00:00');
  const today = fmt(new Date());
  while (fmt(d) <= today) {
    out.push(fmt(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

export default function Home() {
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  const [range, setRange] = useState<Range>(7);
  const [rows, setRows] = useState<Record<string, number>>({});

  // login sound (hooks must live at the top level of the component)
  const loginSound = useAudioPlayer(require('./assets/login.wav'));
  // sound played after a successful save
  const putSound = useAudioPlayer(require('./assets/put.wav'));

  // animations
  const [enter] = useState(() => [0, 1, 2, 3].map(() => new Animated.Value(0)));
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(
      150,
      enter.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  // autoplay the login sound once when Home opens
  useEffect(() => {
    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        loginSound.seekTo(0);
        loginSound.play();
      } catch (e) {
        console.log('Audio error', e);
      }
    })();
  }, []);

  // load the full history from SQLite
  const load = useCallback(async (): Promise<number | null> => {
    const db = dbRef.current;
    if (!db) return null;
    const all = await db.getAllAsync<{ date: string; score: number }>(
      'SELECT date, score FROM ratings ORDER BY date ASC'
    );
    const map: Record<string, number> = {};
    all.forEach((r) => (map[r.date] = r.score));
    setRows(map);
    return map[fmt(new Date())] ?? null;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const db = await SQLite.openDatabaseAsync('ratetheday.db');
        dbRef.current = db;
        await db.execAsync('PRAGMA journal_mode = WAL;');

        // current rating per day
        await db.execAsync(
          'CREATE TABLE IF NOT EXISTS ratings (date TEXT PRIMARY KEY NOT NULL, score REAL NOT NULL);'
        );

        // migration: add updated_at to older installs
        const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(ratings)');
        if (!cols.some((c) => c.name === 'updated_at')) {
          await db.execAsync('ALTER TABLE ratings ADD COLUMN updated_at TEXT;');
        }

        // every single save is kept here, nothing is ever deleted
        await db.execAsync(
          `CREATE TABLE IF NOT EXISTS rating_history (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             date TEXT NOT NULL,
             score REAL NOT NULL,
             saved_at TEXT NOT NULL
           );`
        );

        const today = await load();
        if (today != null) setText(String(today));
      } catch (e) {
        console.log('DB error', e);
      }
    })();
  }, [load]);

  // data for the chart based on the selected range
  const data: DayRating[] = useMemo(() => {
    let keys: string[];
    if (range === 'all') {
      const first = Object.keys(rows).sort()[0];
      keys = first ? daysFrom(first) : lastDays(7);
      if (keys.length < 2) keys = lastDays(7);
    } else {
      keys = lastDays(range);
    }
    return keys.map((date) => ({ date, score: rows[date] ?? null }));
  }, [rows, range]);

  const chartKey = useMemo(
    () => `${range}:${data.map((d) => d.score ?? '-').join(',')}`,
    [data, range]
  );

  const entranceStyle = (v: Animated.Value, distance = 24) => ({
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  });

  // allow digits and one dot (comma becomes dot), max 2 decimals
  const handleChange = (t: string) => {
    let v = t.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    const [i, d] = v.split('.');
    if (d !== undefined) v = i + '.' + d.slice(0, 2);
    setText(v);
    setError('');
    setSaved(false);
  };

  const shake = () =>
    Animated.sequence(
      [10, -10, 6, -6, 0].map((toValue) =>
        Animated.timing(shakeAnim, {
          toValue,
          duration: 50,
          useNativeDriver: true,
        })
      )
    ).start();

  const handleSave = async () => {
    const n = parseFloat(text);
    if (isNaN(n) || n < 0 || n > 10) {
      setError('Enter a number from 0 to 10');
      shake();
      return;
    }
    const score = Math.round(n * 100) / 100;
    const now = new Date();
    const date = fmt(now);
    const stamp = now.toISOString();

    try {
      const db = dbRef.current;
      if (!db) throw new Error('DB not ready');

      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO ratings (date, score, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET score = excluded.score, updated_at = excluded.updated_at`,
          [date, score, stamp]
        );
        await db.runAsync(
          'INSERT INTO rating_history (date, score, saved_at) VALUES (?, ?, ?)',
          [date, score, stamp]
        );
      });

      await load();
      setText(String(score));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);

      try {
        putSound.seekTo(0);
        putSound.play();
      } catch (e) {
        console.log('Audio error', e);
      }
    } catch (e) {
      console.log('DB write error', e);
      setError('Could not save, try again');
    }
  };

  const handlePressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true }).start();

  const handlePressOut = () =>
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* logo + title */}
        <Animated.View style={[styles.titleRow, entranceStyle(enter[0])]}>
          <Image
            source={require('./assets/logo-tr.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Home</Text>
        </Animated.View>

        <Animated.Text style={[styles.subtitle, entranceStyle(enter[0])]}>
          How was your day?
        </Animated.Text>

        {/* rating input */}
        <Animated.View
          style={[
            styles.cardWrap,
            {
              opacity: enter[1],
              transform: [
                {
                  translateY: enter[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          <View style={[styles.card, focused && styles.cardFocused]}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="0.00"
              placeholderTextColor="#333"
              keyboardType="decimal-pad"
              maxLength={5}
              selectionColor={NEON}
              onSubmitEditing={handleSave}
            />
            <Text style={styles.outOf}>/ 10</Text>
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </Animated.View>

        {/* save button */}
        <Animated.View
          style={{
            opacity: enter[2],
            transform: [
              {
                translateY: enter[2].interpolate({
                  inputRange: [0, 1],
                  outputRange: [32, 0],
                }),
              },
              { scale: pressAnim },
            ],
          }}
        >
          <Pressable
            style={styles.button}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>{saved ? 'Saved ✓' : 'Save'}</Text>
          </Pressable>
        </Animated.View>

        {/* chart */}
        <Animated.View style={[styles.chartWrap, entranceStyle(enter[3])]}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Your days</Text>
            <View style={styles.ranges}>
              {RANGES.map((r) => (
                <Pressable
                  key={String(r.key)}
                  onPress={() => setRange(r.key)}
                  style={[styles.rangeBtn, range === r.key && styles.rangeBtnActive]}
                >
                  <Text
                    style={[styles.rangeText, range === r.key && styles.rangeTextActive]}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Chart key={chartKey} data={data} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingTop: 64,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logo: {
    width: 62,
    height: 62,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#888',
    fontSize: 15,
    marginBottom: 28,
  },
  cardWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#050505',
  },
  cardFocused: {
    borderColor: NEON,
  },
  input: {
    minWidth: 140,
    color: '#fff',
    fontSize: 56,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 0,
  },
  outOf: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 8,
    marginBottom: 10,
    opacity: 0.7,
  },
  error: {
    color: '#ff4d4d',
    fontSize: 13,
    marginTop: 12,
  },
  button: {
    backgroundColor: NEON,
    paddingHorizontal: 102,
    paddingVertical: 12,
    borderRadius: 18,
  },
  buttonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  chartWrap: {
    width: '100%',
    marginTop: 40,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  ranges: {
    flexDirection: 'row',
    gap: 6,
  },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  rangeBtnActive: {
    backgroundColor: NEON,
    borderColor: NEON,
  },
  rangeText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rangeTextActive: {
    color: '#000',
  },
});