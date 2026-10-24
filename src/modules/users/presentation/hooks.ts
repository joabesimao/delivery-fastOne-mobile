import { container } from "@/main/container";
import { queryKeys } from "@/main/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountChanges, NewAccount } from "../domain/Account";

const { accounts } = container;

export const useAccounts = () =>
  useQuery({ queryKey: queryKeys.accounts, queryFn: ({ signal }) => accounts.list(signal) });

const useAccountMutation = <V>(mutationFn: (variables: V) => Promise<void>) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
};

export const useCreateAccount = () =>
  useAccountMutation((input: NewAccount) => accounts.create(input));

export const useUpdateAccount = () =>
  useAccountMutation(({ id, changes }: { id: number; changes: AccountChanges }) =>
    accounts.update(id, changes),
  );

export const useRemoveAccount = () => useAccountMutation((id: number) => accounts.remove(id));
