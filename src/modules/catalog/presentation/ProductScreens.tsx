import { useIsOnline } from "@/core/query/useIsOnline";
import { isAdmin } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { describeError } from "@/shared/errors";
import {
  currencyInputMask,
  formatCurrency,
  formatCurrencyInput,
  parseDecimal,
} from "@/shared/format";
import { Chip, includesText, SearchField, SwitchRow } from "@/shared/inputs";
import { confirm, Fab, FieldRow, FormScreen, IconButton, ResourceList } from "@/shared/layout";
import { imageUri, pickImage } from "@/shared/pickImage";
import { makeStyles, useTheme } from "@/shared/ThemeProvider";
import { font, radius, spacing } from "@/shared/theme";
import { Badge, Banner, Button, LoadingState, SectionTitle, TextField } from "@/shared/ui";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { TouchableRipple } from "react-native-paper";
import {
  base64Bytes,
  cleanVariations,
  emptyToNull,
  hasErrors,
  MAX_IMAGE_BYTES,
  validateProduct,
  type Product,
  type ProductVariation,
} from "../domain/Catalog";
import { useProducts, useRemoveProduct, useSaveProduct } from "./hooks";

export function ProductsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { role } = useSession();
  const products = useProducts();
  const remove = useRemoveProduct();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set((products.data ?? []).map((p) => p.category))].sort(),
    [products.data],
  );

  const items = useMemo(
    () =>
      (products.data ?? []).filter(
        (p) =>
          (category === null || p.category === category) &&
          includesText([p.name, p.description, p.brand, p.model, p.barcode, p.category], search),
      ),
    [products.data, search, category],
  );

  const askRemove = async (p: Product) => {
    if (!(await confirm("Excluir produto?", `"${p.name}" será removido do catálogo.`))) return;
    remove.mutate(p.id, {
      onError: (e) => Alert.alert("Não foi possível excluir", describeError(e)),
    });
  };

  return (
    <ResourceList
      query={products}
      items={items}
      keyExtractor={(p) => String(p.id)}
      header={
        <>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Nome, marca ou código de barras"
          />
          {categories.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <Chip label="Todas" selected={category === null} onPress={() => setCategory(null)} />
              {categories.map((c) => (
                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </ScrollView>
          ) : null}
        </>
      }
      emptyTitle={search || category ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
      errorMessage={describeError}
      hint={isAdmin(role) ? "Segure um produto para excluir" : null}
      fab={<Fab label="Novo produto" onPress={() => router.push("/products/new")} />}
      renderItem={({ item }) => (
        <TouchableRipple
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${formatCurrency(item.price)}`}
          onPress={() => router.push(`/products/${item.id}`)}
          onLongPress={isAdmin(role) ? () => void askRemove(item) : undefined}
          style={[styles.product, !item.active && styles.muted]}
        >
          <>
            {item.image ? (
              <Image source={{ uri: imageUri(item.image) }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <Ionicons name="cube-outline" size={22} color={colors.textSubtle} />
              </View>
            )}
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[item.category, item.subcategory, item.brand].filter(Boolean).join(" · ")}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                {!item.active ? <Badge label="Inativo" color={colors.textMuted} /> : null}
              </View>
            </View>
          </>
        </TouchableRipple>
      )}
    />
  );
}

export function ProductFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const products = useProducts();
  const existing = isNew ? undefined : products.data?.find((p) => p.id === Number(id));

  if (!isNew && products.isLoading) return <LoadingState />;
  if (!isNew && !existing) return <Banner tone="error" message="Produto não encontrado." />;

  return (
    <ProductForm key={existing?.id ?? "new"} product={existing} onDone={() => router.back()} />
  );
}

type ImageState = { base64: string; mimeType: string } | null;

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const online = useIsOnline();
  const save = useSaveProduct();
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? formatCurrencyInput(product.price) : "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [model, setModel] = useState(product?.model ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [notes, setNotes] = useState(product?.notes ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [variations, setVariations] = useState<ProductVariation[]>(product?.variations ?? []);
  const [image, setImage] = useState<ImageState>(product?.image ?? null);
  const [imageChanged, setImageChanged] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const chooseImage = async () => {
    const picked = await pickImage();
    if (!picked) return;
    if (base64Bytes(picked.base64) > MAX_IMAGE_BYTES) {
      Alert.alert("Imagem muito grande", "Escolha uma imagem de até 5 MB.");
      return;
    }
    setImage({ base64: picked.base64, mimeType: picked.mimeType });
    setImageChanged(true);
  };

  const updateVariation = (index: number, patch: Partial<ProductVariation>) =>
    setVariations((list) => list.map((v, i) => (i === index ? { ...v, ...patch } : v)));

  const submit = () => {
    const values = { name, price: parseDecimal(price), description, category };
    const found = validateProduct(values);
    setErrors(found);
    if (hasErrors(found)) return;

    save.mutate(
      {
        id: product?.id ?? null,
        input: {
          name: name.trim(),
          price: values.price,
          description: description.trim(),
          category: category.trim(),
          subcategory: emptyToNull(subcategory),
          brand: emptyToNull(brand),
          model: emptyToNull(model),
          unit: emptyToNull(unit),
          barcode: emptyToNull(barcode),
          notes: emptyToNull(notes),
          active,
          variations: cleanVariations(variations),
          ...(imageChanged || !product ? { image } : {}),
        },
      },
      { onSuccess: onDone },
    );
  };

  const saveError = save.error ? describeError(save.error) : null;

  return (
    <FormScreen
      footer={
        <Button
          title={product ? "Salvar alterações" : "Cadastrar produto"}
          onPress={submit}
          loading={save.isPending}
          disabled={!online}
          style={{ flex: 1 }}
        />
      }
    >
      {!online ? <Banner tone="error" message="Sem internet. Conecte-se para salvar." /> : null}
      {saveError ? (
        <Banner
          tone="error"
          message={
            /barcode/i.test(saveError)
              ? "Já existe um produto com esse código de barras."
              : saveError
          }
        />
      ) : null}

      <View style={styles.imageRow}>
        {image ? (
          <Image source={{ uri: imageUri(image) }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={[styles.preview, styles.previewEmpty]}>
            <Ionicons name="image-outline" size={28} color={colors.textSubtle} />
          </View>
        )}
        <View style={styles.imageActions}>
          <Text style={styles.imageHint}>
            {image ? "Foto do produto" : "Sem foto. Aparece na listagem e no catálogo."}
          </Text>
          <Button
            title={image ? "Trocar foto" : "Adicionar foto"}
            variant="secondary"
            onPress={chooseImage}
          />
          {image ? (
            <Button
              title="Remover"
              variant="ghost"
              onPress={() => {
                setImage(null);
                setImageChanged(true);
              }}
            />
          ) : null}
        </View>
      </View>

      <TextField label="Nome" value={name} onChangeText={setName} error={errors.name} />
      <TextField
        label="Preço"
        prefix="R$"
        value={price}
        onChangeText={(v) => setPrice(currencyInputMask(v))}
        keyboardType="number-pad"
        error={errors.price}
      />
      <FieldRow>
        <TextField
          label="Categoria"
          value={category}
          onChangeText={setCategory}
          error={errors.category}
        />
        <TextField
          label="Subcategoria"
          value={subcategory}
          onChangeText={setSubcategory}
          placeholder="Opcional"
        />
      </FieldRow>
      <TextField
        label="Descrição"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        multiline
      />
      <SwitchRow
        label="Produto ativo"
        description="Inativos não aparecem para venda."
        value={active}
        onChange={setActive}
      />

      <SectionTitle>Detalhes</SectionTitle>
      <FieldRow>
        <TextField label="Marca" value={brand} onChangeText={setBrand} />
        <TextField label="Modelo" value={model} onChangeText={setModel} />
      </FieldRow>
      <FieldRow weights={[1, 2]}>
        <TextField
          label="Unidade"
          value={unit}
          onChangeText={setUnit}
          placeholder="un, kg, L"
          accessibilityLabel="Unidade de medida"
        />
        <TextField
          label="Código de barras"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="number-pad"
        />
      </FieldRow>
      <TextField label="Observações" value={notes} onChangeText={setNotes} multiline />

      <SectionTitle
        action={
          <Button
            title="Adicionar"
            variant="ghost"
            icon="add"
            onPress={() => setVariations((list) => [...list, { attribute: "", value: "" }])}
          />
        }
      >
        Variações
      </SectionTitle>
      {variations.length === 0 ? (
        <Text style={styles.meta}>Nenhuma variação. Ex.: Tamanho Grande, Cor Azul.</Text>
      ) : null}
      {variations.map((v, index) => (
        <View key={index} style={styles.variation}>
          <View style={styles.flex}>
            <TextField
              label="Atributo"
              value={v.attribute}
              onChangeText={(t) => updateVariation(index, { attribute: t })}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Valor"
              value={v.value}
              onChangeText={(t) => updateVariation(index, { value: t })}
            />
          </View>
          <IconButton
            icon="close-circle-outline"
            label="Remover variação"
            tone="danger"
            onPress={() => setVariations((list) => list.filter((_, i) => i !== index))}
          />
        </View>
      ))}
    </FormScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  chips: { gap: spacing.sm },
  product: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  muted: { opacity: 0.6 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  thumbEmpty: {
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: font.body, fontWeight: "600", color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
  price: {
    fontSize: font.body,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  imageRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  preview: { width: 96, height: 96, borderRadius: radius.md },
  previewEmpty: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  imageActions: { flex: 1, alignItems: "flex-start", gap: spacing.xs },
  imageHint: { fontSize: font.small, color: colors.textMuted },
  variation: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
}));
