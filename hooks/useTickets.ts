import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTickets, resolveTicket, replyToTicket, updateTicketStatus } from "../lib/firestore/tickets";
import { Ticket } from "../types";
import { toast } from "react-hot-toast";

export function useTickets() {
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery<Ticket[], Error>({
    queryKey: ["tickets"],
    queryFn: getTickets,
    staleTime: 15000,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveTicket(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => replyToTicket(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Reply sent to worker.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "in-progress" | "resolved" }) => updateTicketStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  return {
    tickets: ticketsQuery.data || [],
    isLoading: ticketsQuery.isLoading,
    error: ticketsQuery.error,
    resolveTicket: resolveMutation.mutateAsync,
    replyToTicket: replyMutation.mutateAsync,
    updateTicketStatus: statusMutation.mutateAsync,
  };
}
