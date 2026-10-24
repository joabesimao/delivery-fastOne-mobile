import { container } from "@/main/container";
import { useRealtimeAccount } from "@/main/realtimeSession";
import { queryKeys } from "@/main/queryKeys";
import { describeError } from "@/shared/errors";
import { SearchField } from "@/shared/inputs";
import { makeStyles } from "@/shared/ThemeProvider";
import { font, spacing } from "@/shared/theme";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui";
import { useDebounced } from "@/shared/useDebounced";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { Bubble } from "./ChatScreen";

export function ChatSearchScreen() {
  const styles = useStyles();
  const account = useRealtimeAccount();
  const [term, setTerm] = useState("");
  const query = useDebounced(term.trim());

  const result = useQuery({
    queryKey: queryKeys.chatSearch(query),
    queryFn: ({ signal }) => container.chatSearch.search(query, signal),
    enabled: query.length >= 2,
  });

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <SearchField
          value={term}
          onChangeText={setTerm}
          placeholder="Buscar por texto, pessoa ou loja"
          autoFocus
        />
        {result.data ? (
          <Text style={styles.count}>
            {result.data.total} {result.data.total === 1 ? "mensagem" : "mensagens"}
          </Text>
        ) : null}
      </View>

      {query.length < 2 ? (
        <EmptyState icon="search-outline" title="Digite pelo menos 2 letras" />
      ) : result.isLoading ? (
        <LoadingState message="Buscando..." />
      ) : result.isError ? (
        <ErrorState message={describeError(result.error)} onRetry={() => void result.refetch()} />
      ) : (
        <FlatList
          data={result.data?.messages ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <Bubble message={item} mine={item.sender.id === account?.id} />}
          ListEmptyComponent={<EmptyState title="Nenhuma mensagem encontrada" />}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, gap: spacing.sm },
  count: { fontSize: font.small, color: colors.textMuted },
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
}));
