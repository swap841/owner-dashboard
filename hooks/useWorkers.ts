import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWorkers, createWorker, updateWorker, deleteWorker } from "../lib/firestore/workers";
import { Worker } from "../types";

export function useWorkers() {
  const queryClient = useQueryClient();

  const workersQuery = useQuery<Worker[], Error>({
    queryKey: ["workers"],
    queryFn: getWorkers,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (newWorker: Omit<Worker, "id">) => createWorker(newWorker),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Worker> }) =>
      updateWorker(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorker(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });

  return {
    workers: workersQuery.data || [],
    isLoading: workersQuery.isLoading,
    createWorker: createMutation.mutateAsync,
    updateWorker: updateMutation.mutateAsync,
    deleteWorker: deleteMutation.mutateAsync,
  };
}
