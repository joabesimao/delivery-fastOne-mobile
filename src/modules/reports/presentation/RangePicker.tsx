import { Chip, DateField } from "@/shared/inputs";
import { spacing } from "@/shared/theme";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { lastDays, wholeDays, type DateRange } from "../domain/Reports";

const PRESETS = [
  { days: 1, label: "Hoje" },
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
] as const;

type Preset = (typeof PRESETS)[number]["days"] | "custom";

// Período do relatório: atalhos de dias ou intervalo personalizado (como os filtros de data do web).
export function useDateRange(initialDays: (typeof PRESETS)[number]["days"] = 30) {
  const [preset, setPreset] = useState<Preset>(initialDays);
  const [custom, setCustom] = useState<DateRange>(() => lastDays(initialDays));
  // lastDays vai do início do primeiro dia ao fim de hoje: a chave da busca não muda a cada render.
  const range = preset === "custom" ? custom : lastDays(preset);

  const picker = (
    <View style={{ gap: spacing.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {PRESETS.map((p) => (
          <Chip
            key={p.days}
            label={p.label}
            selected={preset === p.days}
            onPress={() => setPreset(p.days)}
          />
        ))}
        <Chip
          label="Personalizado"
          icon="calendar-outline"
          selected={preset === "custom"}
          onPress={() => {
            setCustom(range);
            setPreset("custom");
          }}
        />
      </ScrollView>
      {preset === "custom" ? (
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <DateField
              label="De"
              value={custom.start}
              maximumDate={custom.end}
              onChange={(start) => setCustom((c) => wholeDays(start, c.end))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label="Até"
              value={custom.end}
              minimumDate={custom.start}
              maximumDate={new Date()}
              onChange={(end) => setCustom((c) => wholeDays(c.start, end))}
            />
          </View>
        </View>
      ) : null}
    </View>
  );

  return { range, picker };
}
