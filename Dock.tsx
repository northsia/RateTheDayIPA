import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Logo from './Logo';
import { useTheme, withAlpha } from './Theme';

export type Tab = 'home' | 'settings';

const INACTIVE = '#777777';

function SettingsIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="6" r="2.6" fill="#0a0a0a" stroke={color} strokeWidth={2} />
      <Circle cx="15" cy="12" r="2.6" fill="#0a0a0a" stroke={color} strokeWidth={2} />
      <Circle cx="9" cy="18" r="2.6" fill="#0a0a0a" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function DockItem({
  label,
  active,
  onPress,
  renderIcon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  renderIcon: (color: string) => React.ReactNode;
}) {
  const { accent } = useTheme();
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: active ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active]);

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [withAlpha(accent, 0), withAlpha(accent, 0.14)],
  });

  const color = active ? accent : INACTIVE;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(press, { toValue: 0.93, useNativeDriver: false }).start()
      }
      onPressOut={() =>
        Animated.spring(press, { toValue: 1, friction: 4, useNativeDriver: false }).start()
      }
    >
      <Animated.View style={[styles.item, { backgroundColor, transform: [{ scale: press }] }]}>
        {renderIcon(color)}
        <Animated.Text style={[styles.label, { color }]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function Dock({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.dock}>
        <DockItem
          label="Home"
          active={tab === 'home'}
          onPress={() => onChange('home')}
          renderIcon={(c) => <Logo size={26} color={c} />}
        />
        <DockItem
          label="Settings"
          active={tab === 'settings'}
          onPress={() => onChange('settings')}
          renderIcon={(c) => <SettingsIcon size={24} color={c} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: 30,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1c1c1c',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});