import Svg, { G, Rect } from "react-native-svg";

// Marca do FastOne: "F" itálico com traços de velocidade. Mesma geometria dos PNGs em assets/.
export function Logo({
  size = 48,
  background,
  color = "#FFFFFF",
}: {
  size?: number;
  background: string;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityLabel="FastOne">
      <Rect width={1024} height={1024} rx={220} fill={background} />
      <G transform="translate(512 512) skewX(-12) translate(-538 -512)" fill={color}>
        <Rect x={452} y={232} width={112} height={560} rx={56} />
        <Rect x={452} y={232} width={340} height={112} rx={56} />
        <Rect x={452} y={456} width={262} height={112} rx={56} />
        <Rect x={232} y={482} width={176} height={60} rx={30} />
        <Rect x={296} y={610} width={112} height={60} rx={30} />
      </G>
    </Svg>
  );
}
