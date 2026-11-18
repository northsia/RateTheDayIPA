import Svg, { Circle, Path, Rect } from 'react-native-svg';

export default function Logo({
  size = 28,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        stroke={color}
        strokeWidth={3}
        fill="none"
      />
      <Path
        d="M10 32 C 16 32, 17 18, 24 22 S 32 34, 38 15"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="38" cy="15" r="3" fill={color} />
    </Svg>
  );
}