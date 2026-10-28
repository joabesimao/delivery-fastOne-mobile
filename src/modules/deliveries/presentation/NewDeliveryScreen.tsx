import { useIsOnline } from "@/core/query/useIsOnline";
import { container } from "@/main/container";
import { formatClientAddress } from "@/modules/catalog/domain/Catalog";
import { useRegisters } from "@/modules/catalog/presentation/hooks";
import { describeError } from "@/shared/errors";
import { escapeHtml, printHtml, sharePdf } from "@/shared/exporters";
import {
  currencyInputMask,
  formatCurrency,
  formatDateTime,
  parseDecimal,
  phoneMask,
} from "@/shared/format";
import { Chip, Select } from "@/shared/inputs";
import { FormScreen } from "@/shared/layout";
import { secureStorage } from "@/core/storage/secureStorage";
import { makeStyles } from "@/shared/ThemeProvider";
import { font, spacing } from "@/shared/theme";
import { Banner, Button, Card, InfoRow, SectionTitle, TextField } from "@/shared/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import {
  buildSheetHtml,
  sheetFormatLabels,
  sheetPageSize,
  type DeliverySheetData,
  type SheetFormat,
} from "../domain/DeliverySheet";
import { useCreateDelivery, useDeliverymen } from "./hooks";

const SHEET_FORMAT_KEY = "fastone.delivery.sheetFormat";
const FORMATS = Object.keys(sheetFormatLabels) as SheetFormat[];

const isSheetFormat = (value: string | null): value is SheetFormat =>
  value !== null && (FORMATS as string[]).includes(value);

const sheetHtml = (data: DeliverySheetData, format: SheetFormat) =>
  buildSheetHtml(data, format, container.env.company, escapeHtml, formatDateTime);

export function NewDeliveryScreen() {
  const styles = useStyles();
  const router = useRouter();
  const online = useIsOnline();
  const params = useLocalSearchParams<{ registerId?: string }>();
  const registers = useRegisters();
  const deliverymen = useDeliverymen(true);
  const create = useCreateDelivery();

  const [registerId, setRegisterId] = useState<number | null>(
    params.registerId ? Number(params.registerId) : null,
  );
  const [deliverymanId, setDeliverymanId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");
  const [format, setFormat] = useState<SheetFormat>("a4");
  const [errors, setErrors] = useState<{ register?: string; quantity?: string; amount?: string }>(
    {},
  );
  const [created, setCreated] = useState<DeliverySheetData | null>(null);

  // O formato da folha fica lembrado no aparelho, como a preferência de impressão do web.
  useEffect(() => {
    void secureStorage.get(SHEET_FORMAT_KEY).then((v) => {
      if (isSheetFormat(v)) setFormat(v);
    });
  }, []);

  const chooseFormat = (value: SheetFormat) => {
    setFormat(value);
    void secureStorage.set(SHEET_FORMAT_KEY, value).catch(() => undefined);
  };

  const activeRegisters = useMemo(
    () => (registers.data ?? []).filter((r) => r.client.active),
    [registers.data],
  );
  const registerOptions = useMemo(
    () =>
      activeRegisters
        .map((r) => ({
          value: r.id,
          label: r.client.name,
          description: `${phoneMask(r.client.phone)} · ${formatClientAddress(r.address)}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [activeRegisters],
  );
  const selected = activeRegisters.find((r) => r.id === registerId);

  const submit = () => {
    const value = parseDecimal(amount);
    const found: typeof errors = {};
    if (!selected) found.register = "Escolha o cliente.";
    if (!(Number(quantity) > 0)) found.quantity = "Informe a quantidade.";
    if (!(value > 0)) found.amount = "Informe o valor.";
    setErrors(found);
    if (Object.keys(found).length > 0 || !selected) return;

    create.mutate(
      { registerId: selected.id, deliverymanId, quantity, amount: value },
      {
        onSuccess: ({ id }) =>
          setCreated({
            orderId: id,
            createdAt: new Date(),
            clientName: selected.client.name,
            phone: phoneMask(selected.client.phone),
            street: selected.address.street,
            number: selected.address.number,
            neighborhood: selected.address.neighborhood,
            city: selected.address.city,
            reference: selected.address.reference,
            quantity,
            amount: formatCurrency(value),
          }),
      },
    );
  };

  const runExport = async (action: "print" | "share") => {
    if (!created) return;
    try {
      const html = sheetHtml(created, format);
      if (action === "print") await printHtml(html, sheetPageSize(format));
      else await sharePdf(html, sheetPageSize(format));
    } catch (error) {
      Alert.alert(
        "Não foi possível gerar a folha",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const reset = () => {
    setCreated(null);
    setRegisterId(null);
    setDeliverymanId(null);
    setQuantity("");
    setAmount("");
    create.reset();
  };

  const formatPicker = (
    <View style={styles.formats}>
      <Text style={styles.label}>Folha de entrega</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {FORMATS.map((f) => (
          <Chip
            key={f}
            label={sheetFormatLabels[f]}
            selected={format === f}
            onPress={() => chooseFormat(f)}
          />
        ))}
      </ScrollView>
    </View>
  );

  if (created) {
    return (
      <FormScreen
        footer={
          <>
            <Button
              title="Nova entrega"
              variant="secondary"
              icon="add"
              onPress={reset}
              style={styles.flex}
            />
            <Button
              title="Ver entrega"
              icon="open-outline"
              onPress={() =>
                created.orderId !== null
                  ? router.replace(`/delivery/${created.orderId}`)
                  : router.replace("/deliveries")
              }
              style={styles.flex}
            />
          </>
        }
      >
        <Banner
          tone="success"
          message={`Entrega ${created.orderId !== null ? `#${created.orderId} ` : ""}criada com sucesso.`}
        />
        <Card>
          <InfoRow icon="person-outline" label="Cliente" value={created.clientName} />
          <InfoRow
            icon="location-outline"
            label="Endereço"
            value={`${created.street}, ${created.number} · ${created.neighborhood}, ${created.city}`}
          />
          <InfoRow icon="cube-outline" label="Quantidade" value={created.quantity} />
          <InfoRow icon="cash-outline" label="Valor" value={created.amount} />
        </Card>
        {formatPicker}
        <View style={styles.row}>
          <Button
            title="Imprimir"
            icon="print-outline"
            onPress={() => void runExport("print")}
            style={styles.flex}
          />
          <Button
            title="Compartilhar PDF"
            variant="secondary"
            icon="share-outline"
            onPress={() => void runExport("share")}
            style={styles.flex}
          />
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      footer={
        <Button
          title="Criar entrega"
          icon="checkmark"
          onPress={submit}
          loading={create.isPending}
          disabled={!online}
          style={styles.flex}
        />
      }
    >
      {!online ? (
        <Banner tone="error" message="Sem internet. Conecte-se para criar a entrega." />
      ) : null}
      {create.isError ? <Banner tone="error" message={describeError(create.error)} /> : null}

      <SectionTitle
        action={
          <Button
            title="Novo cliente"
            variant="ghost"
            icon="person-add-outline"
            onPress={() => router.push("/clients/new")}
          />
        }
      >
        Cliente
      </SectionTitle>
      <Select
        label="Cliente"
        value={registerId}
        options={registerOptions}
        onChange={setRegisterId}
        error={errors.register}
        loading={registers.isLoading}
        placeholder="Buscar cliente"
      />
      {selected ? (
        <Card>
          <InfoRow icon="call-outline" label="Telefone" value={phoneMask(selected.client.phone)} />
          <InfoRow
            icon="location-outline"
            label="Endereço"
            value={formatClientAddress(selected.address)}
          />
          {selected.address.reference ? (
            <InfoRow icon="flag-outline" label="Referência" value={selected.address.reference} />
          ) : null}
        </Card>
      ) : null}

      <SectionTitle>Pedido</SectionTitle>
      <Select
        label="Entregador (opcional)"
        value={deliverymanId}
        options={(deliverymen.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
        onChange={setDeliverymanId}
        placeholder="Definir depois"
        allowClear
        loading={deliverymen.isLoading}
      />
      <TextField
        label="Quantidade"
        value={quantity}
        onChangeText={(v) => setQuantity(v.replace(/\D/g, ""))}
        keyboardType="number-pad"
        error={errors.quantity}
      />
      <TextField
        label="Valor"
        prefix="R$"
        value={amount}
        onChangeText={(v) => setAmount(currencyInputMask(v))}
        keyboardType="number-pad"
        error={errors.amount}
      />
      {formatPicker}
    </FormScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  row: { flexDirection: "row", gap: spacing.md },
  formats: { gap: spacing.xs },
  chips: { gap: spacing.sm },
  label: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
}));
