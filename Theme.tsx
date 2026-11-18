import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import * as SQLite from 'expo-sqlite';

export const DEFAULT_ACCENT = '#15ff00';

export const COLORS = [
  '#15ff00', // green (default)
  '#00e5ff', // cyan
  '#2979ff', // blue
  '#b026ff', // purple
  '#ff2d95', // pink
  '#ff3b30', // red
  '#ff8a00', // orange
  '#ffe600', // yellow
];

export const withAlpha = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

type ThemeValue = { accent: string; setAccent: (c: string) => void };

const ThemeContext = createContext<ThemeValue>({
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState(DEFAULT_ACCENT);
  const [ready, setReady] = useState(false);
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);

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
          ['accent']
        );
        if (row?.value && /^#[0-9a-fA-F]{6}$/.test(row.value)) {
          setAccentState(row.value);
        }
      } catch (e) {
        console.log('Theme DB error', e);
      }
      setReady(true);
    })();
  }, []);

  const setAccent = useCallback(async (color: string) => {
    setAccentState(color);
    try {
      await dbRef.current?.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['accent', color]
      );
    } catch (e) {
      console.log('Theme DB write error', e);
    }
  }, []);

  // black screen until the saved color is loaded, so the color never flashes
  if (!ready) return <View style={{ flex: 1, backgroundColor: '#000000' }} />;

  return (
    <ThemeContext.Provider value={{ accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}