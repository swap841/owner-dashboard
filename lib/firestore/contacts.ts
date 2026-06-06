import { app } from "../../firebaseConfig";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  arrayUnion,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { Contact, ContactInfo, ContactReply } from "../../types";

const db = getFirestore(app);

export async function getContacts(): Promise<Contact[]> {
  try {
    const snap = await getDocs(collection(db, "contacts"));
    const contacts = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Contact[];
    contacts.sort((a, b) => {
      const aT = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
      const bT = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
      return bT - aT;
    });
    return contacts;
  } catch (err) {
    console.error("Failed to fetch contacts:", err);
    return [];
  }
}

export async function getContact(id: string): Promise<Contact | null> {
  const snap = await getDoc(doc(db, "contacts", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Contact;
}

export async function markContactRead(id: string): Promise<void> {
  await updateDoc(doc(db, "contacts", id), { read: true });
}

export async function deleteContact(id: string): Promise<void> {
  await deleteDoc(doc(db, "contacts", id));
}

export async function replyToContact(id: string, message: string): Promise<void> {
  const reply: ContactReply = {
    message,
    createdAt: Timestamp.now(),
    by: "owner",
  };
  await updateDoc(doc(db, "contacts", id), {
    replies: arrayUnion(reply),
    status: "in-progress",
  });
}

export async function updateContactStatus(id: string, status: "open" | "in-progress" | "resolved"): Promise<void> {
  const replyMessage =
    status === "in-progress" ? "We are looking into your complaint. We'll get back to you shortly." :
    status === "resolved" ? "Your complaint has been resolved." :
    "";
  const update: any = { status };
  if (replyMessage) {
    update.replies = arrayUnion({
      message: replyMessage,
      createdAt: Timestamp.now(),
      by: "owner",
    } as ContactReply);
  }
  await updateDoc(doc(db, "contacts", id), update);
}

export async function createReplacementOrder(contactId: string, selectedItems?: string[]): Promise<string | null> {
  const contact = await getContact(contactId);
  if (!contact || !contact.userId || !contact.orderId) return null;

  // Fetch original order
  const originalOrderSnap = await getDoc(doc(db, "users", contact.userId, "orders", contact.orderId));
  if (!originalOrderSnap.exists()) return null;
  const originalOrder = originalOrderSnap.data();

  // If selectedItems provided, filter to only those items; otherwise use all
  const originalItems = originalOrder.items || [];
  const itemsToDeliver = selectedItems && selectedItems.length > 0
    ? originalItems.filter((item: any) => selectedItems.includes(item.name))
    : originalItems;

  // Create replacement order
  const newOrderRef = doc(collection(db, "users", contact.userId, "orders"));
  const replacementOrder = {
    items: itemsToDeliver,
    address: originalOrder.address || {},
    status: "Pending",
    totalAmount: 0,
    payment: { method: "waived", status: "completed", note: "Free replacement" },
    replacementOf: contact.orderId,
    userId: contact.userId,
    createdAt: serverTimestamp(),
    estimatedDeliveryDate: null,
  };
  await setDoc(newOrderRef, replacementOrder);

  // Build reply message
  const itemNames = itemsToDeliver.map((i: any) => i.name).join(", ");
  const replyMessage = selectedItems && selectedItems.length > 0
    ? `We've re-delivered the missing items: ${itemNames}. Replacement order created.`
    : "We've re-delivered all items. Replacement order created.";

  // Update contact with replacement order ID and add reply
  await updateDoc(doc(db, "contacts", contactId), {
    replacementOrderId: newOrderRef.id,
    status: "resolved",
    replies: arrayUnion({
      message: replyMessage,
      createdAt: Timestamp.now(),
      by: "owner",
    } as ContactReply),
  });

  return newOrderRef.id;
}

export async function getContactInfo(): Promise<ContactInfo | null> {
  const ref = doc(db, "contactInfo", "info");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as any;
}

export async function updateContactInfo(data: Partial<ContactInfo>): Promise<void> {
  const ref = doc(db, "contactInfo", "info");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, data);
  } else {
    await updateDoc(ref, data);
  }
}
