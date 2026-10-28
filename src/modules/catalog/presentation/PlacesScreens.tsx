import { isAdmin } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { describeError } from "@/shared/errors";
import { includesText, SearchField, Select } from "@/shared/inputs";
import { confirm, Fab, FormSheet, IconButton, ListRow, ResourceList } from "@/shared/layout";
import { Banner, Button, TextField } from "@/shared/ui";
import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import type { City, Neighborhood } from "../domain/Catalog";
import {
  useCities,
  useNeighborhoods,
  useRemoveCity,
  useRemoveNeighborhood,
  useSaveCity,
  useSaveNeighborhood,
} from "./hooks";

const deleteFailed = (error: unknown) =>
  Alert.alert(
    "Não foi possível excluir",
    `${describeError(error)} Se houver cadastros usando este item, remova-os antes.`,
  );

export function CitiesScreen() {
  const { role } = useSession();
  const cities = useCities();
  const save = useSaveCity();
  const remove = useRemoveCity();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<City | "new" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();

  const items = useMemo(
    () => (cities.data ?? []).filter((c) => includesText([c.name], search)),
    [cities.data, search],
  );

  const open = (city: City | "new") => {
    setEditing(city);
    setName(city === "new" ? "" : city.name);
    setError(undefined);
    save.reset();
  };

  const submit = () => {
    if (!name.trim()) return setError("Informe o nome da cidade.");
    const duplicate = (cities.data ?? []).some(
      (c) =>
        c.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        (editing === "new" || c.id !== editing?.id),
    );
    if (duplicate) return setError("Já existe uma cidade com esse nome.");
    save.mutate(
      { id: editing === "new" || editing === null ? null : editing.id, name },
      { onSuccess: () => setEditing(null) },
    );
  };

  const askRemove = async (city: City) => {
    if (!(await confirm("Excluir cidade?", `"${city.name}" será removida.`))) return;
    remove.mutate(city.id, { onError: deleteFailed });
  };

  return (
    <>
      <ResourceList
        query={cities}
        items={items}
        keyExtractor={(c) => String(c.id)}
        header={<SearchField value={search} onChangeText={setSearch} placeholder="Buscar cidade" />}
        emptyTitle={search ? "Nenhuma cidade encontrada" : "Nenhuma cidade cadastrada"}
        errorMessage={describeError}
        fab={<Fab label="Nova cidade" onPress={() => open("new")} />}
        renderItem={({ item }) => (
          <ListRow
            icon="business-outline"
            title={item.name}
            onPress={() => open(item)}
            right={
              isAdmin(role) ? (
                <IconButton
                  icon="trash-outline"
                  label={`Excluir ${item.name}`}
                  tone="danger"
                  onPress={() => void askRemove(item)}
                />
              ) : undefined
            }
          />
        )}
      />
      <FormSheet
        visible={editing !== null}
        title={editing === "new" ? "Nova cidade" : "Editar cidade"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={() => setEditing(null)}
              style={{ flex: 1 }}
            />
            <Button title="Salvar" onPress={submit} loading={save.isPending} style={{ flex: 1 }} />
          </>
        }
      >
        {save.isError ? <Banner tone="error" message={describeError(save.error)} /> : null}
        <TextField
          label="Nome"
          value={name}
          onChangeText={setName}
          error={error}
          autoFocus
          autoCapitalize="words"
        />
      </FormSheet>
    </>
  );
}

export function NeighborhoodsScreen() {
  const { role } = useSession();
  const neighborhoods = useNeighborhoods();
  const cities = useCities();
  const save = useSaveNeighborhood();
  const remove = useRemoveNeighborhood();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<number | null>(null);
  const [editing, setEditing] = useState<Neighborhood | "new" | null>(null);
  const [name, setName] = useState("");
  const [cityId, setCityId] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ name?: string; city?: string }>({});

  const cityOptions = useMemo(
    () => (cities.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [cities.data],
  );

  const items = useMemo(
    () =>
      (neighborhoods.data ?? []).filter(
        (n) =>
          (cityFilter === null || n.cityId === cityFilter) &&
          includesText([n.name, n.cityName], search),
      ),
    [neighborhoods.data, search, cityFilter],
  );

  const open = (item: Neighborhood | "new") => {
    setEditing(item);
    setName(item === "new" ? "" : item.name);
    setCityId(item === "new" ? cityFilter : item.cityId);
    setErrors({});
    save.reset();
  };

  const submit = () => {
    const found: typeof errors = {};
    if (!name.trim()) found.name = "Informe o nome do bairro.";
    if (cityId === null) found.city = "Escolha a cidade.";
    setErrors(found);
    if (found.name || found.city || cityId === null) return;
    save.mutate(
      { id: editing === "new" || editing === null ? null : editing.id, name, cityId },
      { onSuccess: () => setEditing(null) },
    );
  };

  const askRemove = async (item: Neighborhood) => {
    if (!(await confirm("Excluir bairro?", `"${item.name}" será removido.`))) return;
    remove.mutate(item.id, { onError: deleteFailed });
  };

  return (
    <>
      <ResourceList
        query={neighborhoods}
        items={items}
        keyExtractor={(n) => String(n.id)}
        header={
          <View style={{ gap: 12 }}>
            <SearchField value={search} onChangeText={setSearch} placeholder="Buscar bairro" />
            <Select
              label="Cidade"
              value={cityFilter}
              options={cityOptions}
              onChange={setCityFilter}
              placeholder="Todas as cidades"
              allowClear
            />
          </View>
        }
        emptyTitle={search || cityFilter ? "Nenhum bairro encontrado" : "Nenhum bairro cadastrado"}
        errorMessage={describeError}
        fab={<Fab label="Novo bairro" onPress={() => open("new")} />}
        renderItem={({ item }) => (
          <ListRow
            icon="map-outline"
            title={item.name}
            subtitle={item.cityName}
            onPress={() => open(item)}
            right={
              isAdmin(role) ? (
                <IconButton
                  icon="trash-outline"
                  label={`Excluir ${item.name}`}
                  tone="danger"
                  onPress={() => void askRemove(item)}
                />
              ) : undefined
            }
          />
        )}
      />
      <FormSheet
        visible={editing !== null}
        title={editing === "new" ? "Novo bairro" : "Editar bairro"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={() => setEditing(null)}
              style={{ flex: 1 }}
            />
            <Button title="Salvar" onPress={submit} loading={save.isPending} style={{ flex: 1 }} />
          </>
        }
      >
        {save.isError ? <Banner tone="error" message={describeError(save.error)} /> : null}
        <TextField
          label="Nome"
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
        />
        <Select
          label="Cidade"
          value={cityId}
          options={cityOptions}
          onChange={setCityId}
          error={errors.city}
          loading={cities.isLoading}
        />
      </FormSheet>
    </>
  );
}
