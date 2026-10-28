import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { AddressInput, ClientInput, DeliverymanInput, ProductInput } from "../domain/Catalog";

const { catalog } = container;

const STALE = 60_000;

export const useCities = () =>
  useQuery({
    queryKey: queryKeys.cities,
    queryFn: ({ signal }) => catalog.listCities(signal),
    staleTime: STALE,
  });

export const useNeighborhoods = () =>
  useQuery({
    queryKey: queryKeys.neighborhoods,
    queryFn: ({ signal }) => catalog.listNeighborhoods(signal),
    staleTime: STALE,
  });

export const useClients = () =>
  useQuery({ queryKey: queryKeys.clients, queryFn: ({ signal }) => catalog.listClients(signal) });

export const useRegisters = () =>
  useQuery({
    queryKey: queryKeys.registers,
    queryFn: ({ signal }) => catalog.listRegisters(signal),
  });

export const useCatalogDeliverymen = () =>
  useQuery({
    queryKey: queryKeys.catalogDeliverymen,
    queryFn: ({ signal }) => catalog.listDeliverymen(signal),
  });

export const useProducts = () =>
  useQuery({ queryKey: queryKeys.products, queryFn: ({ signal }) => catalog.listProducts(signal) });

// Toda escrita de cadastro invalida os cadastros e o que depende deles (entregas, frota).
const useCatalogMutation = <V, R = void>(
  mutationFn: (variables: V) => Promise<R>,
  extra: QueryKey[] = [],
) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.catalog });
      for (const key of extra) void client.invalidateQueries({ queryKey: key });
    },
  });
};

export const useSaveCity = () =>
  useCatalogMutation(({ id, name }: { id: number | null; name: string }) =>
    id === null ? catalog.addCity(name) : catalog.updateCity(id, name),
  );

export const useRemoveCity = () => useCatalogMutation((id: number) => catalog.removeCity(id));

export const useSaveNeighborhood = () =>
  useCatalogMutation(({ id, ...input }: { id: number | null; name: string; cityId: number }) =>
    id === null ? catalog.addNeighborhood(input) : catalog.updateNeighborhood(id, input),
  );

export const useRemoveNeighborhood = () =>
  useCatalogMutation((id: number) => catalog.removeNeighborhood(id));

export const useAddClient = () =>
  useCatalogMutation(({ client, address }: { client: ClientInput; address: AddressInput }) =>
    catalog.addClient(client, address),
  );

export const useUpdateClient = () =>
  useCatalogMutation(
    async ({
      id,
      addressId,
      client,
      address,
    }: {
      id: number;
      addressId: number | null;
      client: ClientInput;
      address: AddressInput;
    }) => {
      await catalog.updateClient(id, client);
      if (addressId !== null) await catalog.updateAddress(addressId, address);
    },
    [queryKeys.deliveries],
  );

export const useToggleClient = () =>
  useCatalogMutation(({ id, active }: { id: number; active: boolean }) =>
    catalog.updateClient(id, { active }),
  );

export const useRemoveClient = () =>
  useCatalogMutation(
    (registerId: number) => catalog.removeClient(registerId),
    [queryKeys.deliveries],
  );

export const useSaveDeliveryman = () =>
  useCatalogMutation(
    ({ id, input }: { id: number | null; input: DeliverymanInput }) =>
      id === null ? catalog.addDeliveryman(input) : catalog.updateDeliveryman(id, input),
    [queryKeys.deliverymen, queryKeys.deliveries],
  );

export const useRemoveDeliveryman = () =>
  useCatalogMutation((id: number) => catalog.removeDeliveryman(id), [queryKeys.deliverymen]);

export const useSaveProduct = () =>
  useCatalogMutation(({ id, input }: { id: number | null; input: ProductInput }) =>
    id === null ? catalog.addProduct(input) : catalog.updateProduct(id, input),
  );

export const useRemoveProduct = () => useCatalogMutation((id: number) => catalog.removeProduct(id));
