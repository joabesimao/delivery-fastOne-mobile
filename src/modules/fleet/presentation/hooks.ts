import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NewFuelRefill, NewOilChange, Vehicle } from "../domain/Fleet";

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
  useQuery({
    queryKey: queryKeys.fuelRefills(vehicleId ?? 0),
    queryFn: ({ signal }) => fleet.listFuelRefills(vehicleId ?? 0, signal),
    enabled: vehicleId !== null,
  });

export const useOilChanges = (vehicleId: number | null) =>
  useQuery({
    queryKey: queryKeys.oilChanges(vehicleId ?? 0),
    queryFn: ({ signal }) => fleet.listOilChanges(vehicleId ?? 0, signal),
    enabled: vehicleId !== null,
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
