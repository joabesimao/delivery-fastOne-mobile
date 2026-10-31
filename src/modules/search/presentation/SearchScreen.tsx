import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import { StatusBadge } from "@/modules/deliveries/presentation/components";
import { describeError } from "@/shared/errors";
import { cpfMask, formatCurrency, phoneDigits, phoneMask } from "@/shared/format";
import { SearchField } from "@/shared/inputs";
import { IconButton, ListGroup, ListRow, Screen } from "@/shared/layout";
import { EmptyState, ErrorState, LoadingState, SectionTitle } from "@/shared/ui";
import { useDebounced } from "@/shared/useDebounced";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking } from "react-native";
import { isEmptyResult, isSearchable } from "../domain/Search";

// Busca global do cabeçalho do painel web: pedidos, clientes e entregadores.
export function SearchScreen() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const query = useDebounced(term.trim());

  const result = useQuery({
    queryKey: queryKeys.search(query),
    queryFn: ({ signal }) => container.search.search(query, signal),
    enabled: isSearchable(query),
    staleTime: 30_000,
  });

  const data = result.data;

  return (
    <Screen>
      <SearchField
        value={term}
        onChangeText={setTerm}
        placeholder="Nº do pedido, cliente, CPF, telefone, entregador"
        autoFocus
      />

      {!isSearchable(query) ? (
        <EmptyState
          icon="search-outline"
          title="O que você procura?"
          description="Digite pelo menos 2 caracteres."
        />
      ) : result.isLoading ? (
        <LoadingState message="Buscando..." />
      ) : result.isError ? (
        <ErrorState message={describeError(result.error)} onRetry={() => void result.refetch()} />
      ) : data && isEmptyResult(data) ? (
        <EmptyState title="Nada encontrado" description={`Nenhum resultado para "${query}".`} />
      ) : data ? (
        <>
          {data.orders.length > 0 ? <SectionTitle>Pedidos</SectionTitle> : null}
          <ListGroup>
            {data.orders.map((o) => (
              <ListRow
                key={`o${o.id}`}
                title={`#${o.id} · ${o.clientName}`}
                subtitle={`${formatCurrency(o.amount)}${o.deliverymanName ? ` · ${o.deliverymanName}` : ""}`}
                right={<StatusBadge status={o.status} />}
                onPress={() => router.push(`/delivery/${o.id}`)}
              />
            ))}
          </ListGroup>

          {data.clients.length > 0 ? <SectionTitle>Clientes</SectionTitle> : null}
          <ListGroup>
            {data.clients.map((c) => (
              <ListRow
                key={`c${c.id}`}
                title={c.name}
                subtitle={`${phoneMask(c.phone)} · CPF ${cpfMask(c.cpf)}`}
                onPress={() => router.push(`/clients/${c.id}`)}
              />
            ))}
          </ListGroup>

          {data.deliverymen.length > 0 ? <SectionTitle>Entregadores</SectionTitle> : null}
          <ListGroup>
            {data.deliverymen.map((d) => (
              <ListRow
                key={`d${d.id}`}
                title={d.name}
                subtitle={phoneMask(d.phone)}
                right={
                  <IconButton
                    icon="call-outline"
                    label={`Ligar para ${d.name}`}
                    tone="primary"
                    onPress={() => void Linking.openURL(`tel:${phoneDigits(d.phone)}`)}
                  />
                }
              />
            ))}
          </ListGroup>
        </>
      ) : null}
    </Screen>
  );
}
