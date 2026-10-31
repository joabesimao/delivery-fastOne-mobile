import { useIsOnline } from "@/core/query/useIsOnline";
import { validateOilInterval } from "@/modules/fleet/domain/Fleet";
import { useOilChangeInterval, useSetOilChangeInterval } from "@/modules/fleet/presentation/hooks";
import { describeError } from "@/shared/errors";
import { formatNumber } from "@/shared/format";
import { FormScreen } from "@/shared/layout";
import { Banner, Button, ErrorState, LoadingState, TextField } from "@/shared/ui";
import { useState } from "react";

// "Configurações de frota" do web: a cada quantos km a troca de óleo vence.
export function FleetSettingsScreen() {
  const interval = useOilChangeInterval();
  if (interval.isLoading) return <LoadingState />;
  if (interval.isError) {
    return (
      <ErrorState message={describeError(interval.error)} onRetry={() => void interval.refetch()} />
    );
  }
  return <FleetSettingsForm current={interval.data ?? null} />;
}

function FleetSettingsForm({ current }: { current: number | null }) {
  const online = useIsOnline();
  const save = useSetOilChangeInterval();
  const [km, setKm] = useState(current ? String(current) : "");
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    const value = Number(km);
    const found = validateOilInterval(value);
    setError(found ?? undefined);
    if (!found) save.mutate(value);
  };

  return (
    <FormScreen
      footer={
        <Button
          title="Salvar"
          onPress={submit}
          loading={save.isPending}
          disabled={!online}
          style={{ flex: 1 }}
        />
      }
    >
      {save.isSuccess ? <Banner tone="success" message="Intervalo atualizado." /> : null}
      {save.isError ? <Banner tone="error" message={describeError(save.error)} /> : null}
      <Banner
        tone="info"
        message={
          current
            ? `Hoje a troca vence a cada ${formatNumber(current)} km. Vale para as próximas trocas registradas.`
            : "Nenhum intervalo configurado ainda."
        }
      />
      <TextField
        label="Intervalo da troca de óleo (km)"
        value={km}
        onChangeText={(v) => setKm(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        error={error}
        placeholder="Ex.: 1000"
      />
    </FormScreen>
  );
}
