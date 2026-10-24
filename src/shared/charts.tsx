import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { makeStyles, useTheme } from "./ThemeProvider";
import { font, radius, spacing } from "./theme";

export interface ChartDatum {
  label: string;
  value: number;
}

// Barras horizontais de uma série só: rótulo e valor sempre visíveis (sem depender de cor).
export function BarList({
  data,
  format = String,
  limit = 8,
}: {
  data: readonly ChartDatum[];
  format?: (value: number) => string;
  limit?: number;
}) {
  const styles = useStyles();
  const visible = foldRest(data, limit);
  const max = Math.max(1, ...visible.map((d) => d.value));

  return (
    <View style={styles.barList} accessibilityRole="list">
      {visible.map((d) => (
        <View
          key={d.label}
          style={styles.barRow}
          accessible
          accessibilityLabel={`${d.label}: ${format(d.value)}`}
        >
          <View style={styles.barLabels}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={styles.barValue}>{format(d.value)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${(d.value / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Colunas por dia; tocar numa coluna mostra o valor dela.
export function ColumnChart({
  data,
  format = String,
  height = 140,
}: {
  data: readonly ChartDatum[];
  format?: (value: number) => string;
  height?: number;
}) {
  const styles = useStyles();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const focused = active !== null ? data[active] : null;

  return (
    <View>
      <Text style={styles.columnFocus}>
        {focused
          ? `${focused.label}: ${format(focused.value)}`
          : "Toque numa coluna para ver o valor"}
      </Text>
      <View style={[styles.columns, { height }]}>
        {data.map((d, index) => (
          <Pressable
            key={`${d.label}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`${d.label}: ${format(d.value)}`}
            onPress={() => setActive(index === active ? null : index)}
            style={styles.columnSlot}
          >
            <View
              style={[
                styles.column,
                { height: `${Math.max(2, (d.value / max) * 100)}%` },
                active !== null && active !== index && styles.columnDim,
              ]}
            />
          </Pressable>
        ))}
      </View>
      <View style={styles.columnLabels}>
        {data.map((d, index) => (
          <Text key={`${d.label}-${index}`} style={styles.columnLabel} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Rosca com legenda e valores sempre visíveis; no máximo 3 fatias (o resto vira "Outros").
export function Donut({
  data,
  format = String,
  size = 140,
}: {
  data: readonly ChartDatum[];
  format?: (value: number) => string;
  size?: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const slices = foldRest(data, colors.chart.length);
  const total = slices.reduce((sum, d) => sum + d.value, 0);
  const stroke = 18;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // Espaço de 2px entre fatias, na cor da superfície.
  const gap = slices.filter((d) => d.value > 0).length > 1 ? 2 : 0;

  let offset = 0;
  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size} accessibilityElementsHidden>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        {total > 0
          ? slices.map((d, index) => {
              const length = (d.value / total) * circumference;
              const dash = Math.max(0, length - gap);
              const circle = (
                <Circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={colors.chart[index]}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += length;
              return circle;
            })
          : null}
      </Svg>
      <View style={styles.legend}>
        {slices.map((d, index) => (
          <View
            key={d.label}
            style={styles.legendRow}
            accessible
            accessibilityLabel={`${d.label}: ${format(d.value)}`}
          >
            <View style={[styles.swatch, { backgroundColor: colors.chart[index] }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={styles.legendValue}>
              {format(d.value)}
              {total > 0 ? ` · ${Math.round((d.value / total) * 100)}%` : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const foldRest = (data: readonly ChartDatum[], limit: number): ChartDatum[] => {
  if (data.length <= limit) return [...data];
  const head = data.slice(0, limit - 1);
  const rest = data.slice(limit - 1).reduce((sum, d) => sum + d.value, 0);
  return [...head, { label: "Outros", value: rest }];
};

const useStyles = makeStyles((colors) => ({
  barList: { gap: spacing.md },
  barRow: { gap: spacing.xs },
  barLabels: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  barLabel: { flex: 1, fontSize: font.small, color: colors.text },
  barValue: { fontSize: font.small, fontWeight: "700", color: colors.text },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, overflow: "hidden" },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.chart[0] },
  columnFocus: { fontSize: font.small, color: colors.textMuted, marginBottom: spacing.sm },
  columns: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  columnSlot: { flex: 1, height: "100%", justifyContent: "flex-end" },
  column: {
    backgroundColor: colors.chart[0],
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginHorizontal: 1,
  },
  columnDim: { opacity: 0.4 },
  columnLabels: { flexDirection: "row", gap: 2, marginTop: spacing.xs },
  columnLabel: { flex: 1, fontSize: 10, color: colors.textMuted, textAlign: "center" },
  donutWrap: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  legend: { flex: 1, gap: spacing.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: radius.sm / 4 },
  legendLabel: { flex: 1, fontSize: font.small, color: colors.text },
  legendValue: { fontSize: font.small, fontWeight: "700", color: colors.text },
}));
