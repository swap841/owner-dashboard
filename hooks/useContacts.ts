import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, markContactRead, deleteContact, replyToContact, updateContactStatus, createReplacementOrder, getContactInfo, updateContactInfo } from "../lib/firestore/contacts";
import { Contact, ContactInfo } from "../types";
import { toast } from "react-hot-toast";

export function useContacts() {
  const queryClient = useQueryClient();

  const contactsQuery = useQuery<Contact[], Error>({
    queryKey: ["contacts"],
    queryFn: getContacts,
    staleTime: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markContactRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => replyToContact(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Reply sent to customer.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "in-progress" | "resolved" }) => updateContactStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (contactId: string) => createReplacementOrder(contactId),
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      if (orderId) {
        toast.success(`Replacement order created: ${orderId.slice(-8).toUpperCase()}`);
      } else {
        toast.error("Could not create replacement order. Check that the contact has a user ID and order ID.");
      }
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    markContactRead: markReadMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    replyToContact: replyMutation.mutateAsync,
    updateContactStatus: statusMutation.mutateAsync,
    createReplacementOrder: reorderMutation.mutateAsync,
  };
}

export function useContactInfoSettings() {
  const queryClient = useQueryClient();

  const contactInfoQuery = useQuery<ContactInfo | null, Error>({
    queryKey: ["contactInfo"],
    queryFn: getContactInfo,
    staleTime: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ContactInfo>) => updateContactInfo(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contactInfo"] }),
  });

  return {
    contactInfo: contactInfoQuery.data,
    isLoading: contactInfoQuery.isLoading,
    updateContactInfo: updateMutation.mutateAsync,
  };
}
