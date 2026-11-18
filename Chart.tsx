import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

export type DayRating = { date: string; score: number | null };

const NEON = '#15ff00';
const H = 190;
const PAD_L = 26;
const PAD_R = 14;
const PAD_T = 26;
const PAD_B = 8;
const LABEL_H = 22;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// glow layers: wide + faint -> thin + solid
const LAYERS = [
  { width: 16, opacity: 0.07 },
  { width: 10, opacity: 0.14 },
  { width: 6, opacity: 0.28 },
  { width: 2.5, opacity: 1 },
];

export default function Chart({ data }: { data: DayRating[] }) {
  const [width, setWidth] = useState(0);
  const drawAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  const n = data.length;
  const innerW = Math.max(width - PAD_L - PAD_R, 0);
  const innerH = H - PAD_T - PAD_B;

  const x = (i: number) => PAD_L + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (s: number) => PAD_T + innerH * (1 - s / 10);

  const points = data
    .map((d, i) => ({ i, score: d.score, x: x(i), y: d.score == null ? 0 : y(d.score) }))
    .filter((p) => p.score != null);

  // smooth path through rated days
  let path = '';
  let length = 1;
  points.forEach((p, k) => {
    if (k === 0) {
      path = `M ${p.x} ${p.y}`;
    } else {
      const prev = points[k - 1];
      const cx = (prev.x + p.x) / 2;
      path += ` C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
      length += Math.hypot(p.x - prev.x, p.y - prev.y) * 1.3;
    }
  });

  useEffect(() => {
    if (!width) return;
    drawAnim.setValue(0);
    dotAnim.setValue(0);
    Animated.parallel([
      Animated.timing(drawAnim, {
        toValue: 1,
        duration: 1300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(dotAnim, {
        toValue: 1,
        duration: 600,
        delay: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [width]);

  const dashOffset = drawAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [length, 0],
  });

  const handleLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const labelStep = Math.max(1, Math.ceil(n / 7));
  const labelFor = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return n <= 7 ? DAYS[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <View style={styles.wrap} onLayout={handleLayout}>
      {width > 0 && (
        <>
          <Svg width={width} height={H}>
            {/* grid + scale: 0, 5, 10 */}
            {[0, 5, 10].map((v) => (
              <Line
                key={v}
                x1={PAD_L}
                x2={width - PAD_R}
                y1={y(v)}
                y2={y(v)}
                stroke="#fff"
                strokeOpacity={v === 0 ? 0.25 : 0.08}
                strokeWidth={1}
              />
            ))}

            {/* neon line */}
            {points.length > 1 &&
              LAYERS.map((l) => (
                <AnimatedPath
                  key={l.width}
                  d={path}
                  stroke={NEON}
                  strokeOpacity={l.opacity}
                  strokeWidth={l.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={[length, length]}
                  strokeDashoffset={dashOffset}
                />
              ))}

            {/* neon points */}
            {points.map((p) => (
              <AnimatedCircle key={`g${p.i}`} cx={p.x} cy={p.y} r={9} fill={NEON} opacity={dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] })} />
            ))}
            {points.map((p) => (
              <AnimatedCircle key={`c${p.i}`} cx={p.x} cy={p.y} r={4} fill="#000" stroke={NEON} strokeWidth={2} opacity={dotAnim} />
            ))}
          </Svg>

          {/* scale labels */}
          {[0, 5, 10].map((v) => (
            <Text key={v} style={[styles.scale, { top: y(v) - 7 }]}>
              {v}
            </Text>
          ))}

          {/* value labels (only when few points) */}
          {n <= 7 &&
            points.map((p) => (
              <Animated.Text
                key={`v${p.i}`}
                style={[styles.value, { left: p.x - 20, top: p.y - 26, opacity: dotAnim }]}
              >
                {String(+(p.score as number).toFixed(2))}
              </Animated.Text>
            ))}

          {/* day labels */}
          <View style={styles.labels}>
            {data.map((d, i) =>
              (n - 1 - i) % labelStep === 0 ? (
                <Text
                  key={d.date}
                  style={[styles.day, { left: x(i) - 20 }, i === n - 1 && styles.dayToday]}
                >
                  {labelFor(d.date)}
                </Text>
              ) : null
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: H + LABEL_H,
  },
  scale: {
    position: 'absolute',
    left: 0,
    width: 20,
    textAlign: 'right',
    color: '#fff',
    opacity: 0.4,
    fontSize: 10,
  },
  value: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  labels: {
    position: 'absolute',
    top: H + 4,
    left: 0,
    right: 0,
    height: LABEL_H,
  },
  day: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    color: '#fff',
    opacity: 0.6,
    fontSize: 11,
  },
  dayToday: {
    opacity: 1,
    fontWeight: 'bold',
  },
});