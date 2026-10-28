import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FleetFilter,
  NewFuelRefill,
  NewOilChange,
  Vehicle,
  VehicleInput,
} from "../domain/Fleet";

const { fleet, vehiclePreference } = container;

export const useVehicles = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: ({ signal }) => fleet.listVehicles(signal),
    enabled,
    staleTime: 5 * 60_000,
  });

const useMyVehicleId = () =>
  useQuery({
    queryKey: queryKeys.myVehicleId,
    queryFn: () => vehiclePreference.get(),
    staleTime: Infinity,
  });

// "Meu veículo" do entregador. O veículo traz o deliverymanId, que identifica as entregas dele.
export const useMyVehicle = (enabled = true) => {
  const vehicles = useVehicles(enabled);
  const myVehicleId = useMyVehicleId();
  const vehicle: Vehicle | null = vehicles.data?.find((v) => v.id === myVehicleId.data) ?? null;

  return {
    vehicle,
    deliverymanId: vehicle?.deliverymanId ?? null,
    isLoading: vehicles.isLoading || myVehicleId.isLoading,
    vehicles,
  };
};

export const useSetMyVehicle = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: number | null) => vehiclePreference.set(vehicleId),
    onSuccess: (_result, vehicleId) => client.setQueryData(queryKeys.myVehicleId, vehicleId),
  });
};

export const useFuelRefills = (vehicleId: number | null) =>
  useFuelRefillList({ vehicleId: vehicleId ?? 0 }, vehicleId !== null);

export const useOilChanges = (vehicleId: number | null) =>
  useOilChangeList({ vehicleId: vehicleId ?? 0 }, vehicleId !== null);

// Lista geral (gestor): filtros opcionais por veículo e entregador.
export const useFuelRefillList = (filter: FleetFilter, enabled = true) =>
  useQuery({
    queryKey: queryKeys.fuelRefills(filter),
    queryFn: ({ signal }) => fleet.listFuelRefills(filter, signal),
    enabled,
  });

export const useOilChangeList = (filter: FleetFilter, enabled = true) =>
  useQuery({
    queryKey: queryKeys.oilChanges(filter),
    queryFn: ({ signal }) => fleet.listOilChanges(filter, signal),
    enabled,
  });

export const useOilChangeInterval = () =>
  useQuery({
    queryKey: queryKeys.oilChangeInterval,
    queryFn: ({ signal }) => fleet.getOilChangeInterval(signal),
  });

const useFleetMutation = <V>(mutationFn: (variables: V) => Promise<void>) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.fleet });
      // O backend gera avisos de abastecimento/troca para os gestores.
      void client.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
};

export const useAddFuelRefill = () =>
  useFleetMutation((input: NewFuelRefill) => fleet.addFuelRefill(input));

export const useAddOilChange = () =>
  useFleetMutation((input: NewOilChange) => fleet.addOilChange(input));

export const useUpdateFuelRefill = () =>
  useFleetMutation(({ id, input }: { id: number; input: NewFuelRefill }) =>
    fleet.updateFuelRefill(id, input),
  );

export const useRemoveFuelRefill = () =>
  useFleetMutation((id: number) => fleet.removeFuelRefill(id));

export const useUpdateOilChange = () =>
  useFleetMutation(({ id, input }: { id: number; input: NewOilChange }) =>
    fleet.updateOilChange(id, input),
  );

export const useRemoveOilChange = () => useFleetMutation((id: number) => fleet.removeOilChange(id));

export const useSaveVehicle = () =>
  useFleetMutation(({ id, input }: { id: number | null; input: VehicleInput }) =>
    id === null ? fleet.addVehicle(input) : fleet.updateVehicle(id, input),
  );

export const useRemoveVehicle = () => useFleetMutation((id: number) => fleet.removeVehicle(id));

export const useSetOilChangeInterval = () =>
  useFleetMutation((km: number) => fleet.setOilChangeInterval(km));
