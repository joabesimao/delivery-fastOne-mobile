import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Delivery, DeliveryStatus } from "../domain/Delivery";

const repository = container.deliveries;

export const useDeliveries = () =>
  useQuery({
    queryKey: queryKeys.deliveryList,
    queryFn: ({ signal }) => repository.list(signal),
  });

export const useDelivery = (id: number) => {
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.delivery(id),
    queryFn: ({ signal }) => repository.getById(id, signal),
    enabled: Number.isInteger(id) && id > 0,
    // Abre na hora com o que a lista já tem; a busca completa atualiza em seguida.
    initialData: () =>
      client.getQueryData<Delivery[]>(queryKeys.deliveryList)?.find((d) => d.id === id),
    initialDataUpdatedAt: () => client.getQueryState(queryKeys.deliveryList)?.dataUpdatedAt,
  });
};

export const useDeliverymen = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.deliverymen,
    queryFn: ({ signal }) => repository.listDeliverymen(signal),
    enabled,
    staleTime: 5 * 60_000,
  });

type Snapshot = { list?: Delivery[]; detail?: Delivery };

const useOptimisticDeliveryMutation = <V extends { id: number }>(
  mutate: (variables: V) => Promise<Delivery>,
  apply: (delivery: Delivery, variables: V) => Delivery,
) => {
  const client = useQueryClient();

  return useMutation<Delivery, unknown, V, Snapshot>({
    mutationFn: mutate,
    onMutate: async (variables) => {
      await client.cancelQueries({ queryKey: queryKeys.deliveries });
      const snapshot: Snapshot = {
        list: client.getQueryData<Delivery[]>(queryKeys.deliveryList),
        detail: client.getQueryData<Delivery>(queryKeys.delivery(variables.id)),
      };
      client.setQueryData<Delivery[]>(queryKeys.deliveryList, (list) =>
        list?.map((d) => (d.id === variables.id ? apply(d, variables) : d)),
      );
      client.setQueryData<Delivery>(queryKeys.delivery(variables.id), (d) =>
        d ? apply(d, variables) : d,
      );
      return snapshot;
    },
    onError: (_error, variables, snapshot) => {
      client.setQueryData(queryKeys.deliveryList, snapshot?.list);
      client.setQueryData(queryKeys.delivery(variables.id), snapshot?.detail);
    },
    onSuccess: (delivery) => {
      client.setQueryData(queryKeys.delivery(delivery.id), delivery);
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.deliveries }),
  });
};

export const useUpdateDeliveryStatus = () =>
  useOptimisticDeliveryMutation<{ id: number; status: DeliveryStatus }>(
    ({ id, status }) => repository.updateStatus(id, status),
    (delivery, { status }) => ({
      ...delivery,
      status,
      finishedAt: status === "finished" ? new Date() : delivery.finishedAt,
    }),
  );

export const useAssignDeliveryman = () =>
  useOptimisticDeliveryMutation<{
    id: number;
    deliveryman: { id: number; name: string; phone: string };
  }>(
    ({ id, deliveryman }) => repository.assignDeliveryman(id, deliveryman.id),
    (delivery, { deliveryman }) => ({ ...delivery, deliveryman }),
  );
