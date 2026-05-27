import { app } from "../../firebaseConfig";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { Ticket, TicketReply } from "../../types";

const db = getFirestore(app);

export async function getTickets(): Promise<Ticket[]> {
  const snap = await getDocs(query(collection(db, "tickets"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Ticket[];
}

export async function resolveTicket(id: string): Promise<void> {
  await updateDoc(doc(db, "tickets", id), { resolved: true, status: "resolved" });
}

export async function replyToTicket(id: string, message: string): Promise<void> {
  const reply: TicketReply = {
    message,
    createdAt: Timestamp.now(),
    by: "owner",
  };
  await updateDoc(doc(db, "tickets", id), {
    replies: arrayUnion(reply),
    status: "in-progress",
  });
}

export async function updateTicketStatus(id: string, status: "open" | "in-progress" | "resolved"): Promise<void> {
  const updates: any = { status };
  if (status === "resolved") updates.resolved = true;
  await updateDoc(doc(db, "tickets", id), updates);
}
