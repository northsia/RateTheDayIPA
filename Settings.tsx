import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, useTheme } from './Theme';

// ✏️ Edit the developer info here
const DEVELOPER: {
  name: string;
  role: string;
  photo: ImageSourcePropType | null;
} = {
  name: 'Northern Meed',
  role: 'App Developer',
  // To use a real photo: put it in assets/developer.png and replace the line below with
  // photo: require('./assets/developer.png'),
  photo: null,
};

function Swatch({
  color,
  selected,
  onPress,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(selected ? 1.1 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.1 : 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.swatchRing,
          selected && { borderColor: '#fff' },
          { transform: [{ scale }] },
        ]}
      >
        <View style={[styles.swatch, { backgroundColor: color }]} />
      </Animated.View>
    </Pressable>
  );
}

export default function Settings() {
  const { accent, setAccent } = useTheme();
  const enter = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      130,
      enter.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const entrance = (v: Animated.Value) => ({
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
      },
    ],
  });

  const initials = DEVELOPER.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.flex}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text style={[styles.title, entrance(enter[0])]}>
          Settings
        </Animated.Text>

        {/* accent color */}
        <Animated.View style={[styles.section, entrance(enter[1])]}>
          <Text style={styles.sectionTitle}>Accent color</Text>
          <View style={styles.card}>
            <View style={styles.swatches}>
              {COLORS.map((c) => (
                <Swatch
                  key={c}
                  color={c}
                  selected={c.toLowerCase() === accent.toLowerCase()}
                  onPress={() => setAccent(c)}
                />
              ))}
            </View>
            <View style={styles.previewRow}>
              <View style={[styles.previewLine, { backgroundColor: accent }]} />
              <Text style={[styles.previewText, { color: accent }]}>Preview</Text>
            </View>
          </View>
        </Animated.View>

        {/* developer */}
        <Animated.View style={[styles.section, entrance(enter[2])]}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={[styles.card, styles.devCard]}>
            {DEVELOPER.photo ? (
              <Image
                source={DEVELOPER.photo}
                style={[styles.photo, { borderColor: accent }]}
              />
            ) : (
              <View style={[styles.photo, styles.photoFallback, { borderColor: accent }]}>
                <Text style={[styles.initials, { color: accent }]}>{initials}</Text>
              </View>
            )}
            <View style={styles.devInfo}>
              <Text style={styles.devName}>{DEVELOPER.name}</Text>
              <Text style={styles.devRole}>{DEVELOPER.role}</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.version}>Ratetheday · v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    padding: 32,
    paddingTop: 64,
    paddingBottom: 140,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 28,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 24,
    padding: 20,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  swatchRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  previewLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  previewText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  devCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
  },
  photoFallback: {
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  devInfo: {
    flex: 1,
  },
  devName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  devRole: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  version: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});