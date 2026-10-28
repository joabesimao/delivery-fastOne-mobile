export const DELIVERY_STATUSES = ["actived", "delivered", "finished"] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface DeliveryAddress {
  street: string;
  number: number;
  neighborhood: string;
  city: string;
  reference: string;
}

export interface DeliveryPerson {
  id: number;
  name: string;
  phone: string;
}

export interface Delivery {
  id: number;
  quantity: string;
  amount: number;
  date: Date;
  finishedAt: Date | null;
  status: DeliveryStatus;
  client: { name: string; phone: string };
  address: DeliveryAddress;
  deliveryman: DeliveryPerson | null;
}

// Rótulos iguais aos do painel web.
export const statusLabels: Record<DeliveryStatus, string> = {
  actived: "Ativo",
  delivered: "Em entrega",
  finished: "Finalizado",
};

// O backend só aceita avançar: actived → delivered → finished.
const nextStatusOf: Record<DeliveryStatus, DeliveryStatus | null> = {
  actived: "delivered",
  delivered: "finished",
  finished: null,
};

export const nextStatus = (status: DeliveryStatus): DeliveryStatus | null => nextStatusOf[status];

export const canTransition = (from: DeliveryStatus, to: DeliveryStatus): boolean =>
  from !== "finished" && DELIVERY_STATUSES.indexOf(to) >= DELIVERY_STATUSES.indexOf(from);

export const isOpen = (delivery: Delivery): boolean => delivery.status !== "finished";

export const formatAddress = ({ street, number, neighborhood, city }: DeliveryAddress) =>
  `${street}, ${number} · ${neighborhood}, ${city}`;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const matchesSearch = (delivery: Delivery, term: string): boolean => {
  const query = normalize(term.trim());
  if (!query) return true;
  const haystack = [
    String(delivery.id),
    delivery.client.name,
    delivery.address.street,
    delivery.address.neighborhood,
    delivery.address.city,
    delivery.deliveryman?.name ?? "",
  ]
    .map(normalize)
    .join(" ");
  return haystack.includes(query);
};

export interface DeliveryFilters {
  // null = sem filtro; 0 = "sem entregador".
  deliverymanId: number | null;
  city: string | null;
  neighborhood: string | null;
}

export const NO_FILTERS: DeliveryFilters = { deliverymanId: null, city: null, neighborhood: null };

export const activeFilterCount = (f: DeliveryFilters) =>
  [f.deliverymanId, f.city, f.neighborhood].filter((v) => v !== null).length;

// Mesmos filtros da listagem de entregas do painel web.
export const matchesFilters = (delivery: Delivery, f: DeliveryFilters): boolean =>
  (f.deliverymanId === null || (delivery.deliveryman?.id ?? 0) === f.deliverymanId) &&
  (f.city === null || delivery.address.city === f.city) &&
  (f.neighborhood === null || delivery.address.neighborhood === f.neighborhood);

// Opções dos filtros a partir das próprias entregas (só aparece o que existe na lista).
export const filterOptions = (deliveries: readonly Delivery[], city: string | null) => {
  const sorted = (values: Iterable<string>) =>
    [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b));
  const people = new Map<number, string>();
  for (const d of deliveries) if (d.deliveryman) people.set(d.deliveryman.id, d.deliveryman.name);
  return {
    deliverymen: [...people]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    cities: sorted(deliveries.map((d) => d.address.city)),
    neighborhoods: sorted(
      deliveries
        .filter((d) => city === null || d.address.city === city)
        .map((d) => d.address.neighborhood),
    ),
  };
};

// Abertas primeiro (as mais antigas no topo: são as mais urgentes); finalizadas, as mais recentes primeiro.
export const sortForWork = (deliveries: readonly Delivery[]): Delivery[] =>
  [...deliveries].sort((a, b) => {
    const aOpen = isOpen(a);
    if (aOpen !== isOpen(b)) return aOpen ? -1 : 1;
    const diff = a.date.getTime() - b.date.getTime();
    return aOpen ? diff : -diff;
  });

export const countByStatus = (deliveries: readonly Delivery[]): Record<DeliveryStatus, number> => {
  const counts: Record<DeliveryStatus, number> = { actived: 0, delivered: 0, finished: 0 };
  for (const delivery of deliveries) counts[delivery.status] += 1;
  return counts;
};
