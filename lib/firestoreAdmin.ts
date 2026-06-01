function getCreds(): { clientEmail: string; privateKey: string; projectId: string } {
  const b64 = process.env.FIREBASE_ADMIN_KEY;
  if (b64) {
    try {
      const parsed = JSON.parse(atob(b64));
      return { clientEmail: parsed.client_email, privateKey: parsed.private_key, projectId: parsed.project_id };
    } catch {}
  }
  return {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "my-store-51b02",
  };
}

function pemToBinary(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const bytes = new Uint8Array(atob(b64).length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = atob(b64).charCodeAt(i);
  return bytes.buffer;
}

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

let cachedToken: { token: string; expiry: number } | null = null;

async function getAccessToken(scope?: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry) return cachedToken.token;

  const { clientEmail, privateKey } = getCreds();
  if (!clientEmail || !privateKey) throw new Error("Firebase Admin: missing credentials");

  const s = scope || "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform";
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: clientEmail, scope: s, aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now };

  const enc = new TextEncoder();
  const h = base64url(enc.encode(JSON.stringify(header)));
  const c = base64url(enc.encode(JSON.stringify(claim)));
  const message = `${h}.${c}`;

  const key = await crypto.subtle.importKey("pkcs8", pemToBinary(privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, enc.encode(message));
  const jwt = `${message}.${base64url(sig)}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  if (!resp.ok) throw new Error(`OAuth error: ${await resp.text()}`);
  const data = await resp.json();
  cachedToken = { token: data.access_token, expiry: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function toFields(obj: Record<string, any>): Record<string, any> {
  const f: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) f[k] = { nullValue: null };
    else if (typeof v === "string") f[k] = { stringValue: v };
    else if (typeof v === "number") f[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === "boolean") f[k] = { booleanValue: v };
    else if (v instanceof Date) f[k] = { timestampValue: v.toISOString() };
    else if (Array.isArray(v)) f[k] = { arrayValue: { values: v.map((x: any) => ({ mapValue: { fields: toFields(typeof x === "object" && x !== null ? x : { value: x }) } })) } };
    else if (typeof v === "object") f[k] = { mapValue: { fields: toFields(v) } };
    else f[k] = { stringValue: String(v) };
  }
  return f;
}

function fromFields(fields: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) r[k] = v.stringValue;
    else if (v.integerValue !== undefined) r[k] = parseInt(v.integerValue, 10);
    else if (v.doubleValue !== undefined) r[k] = v.doubleValue;
    else if (v.booleanValue !== undefined) r[k] = v.booleanValue;
    else if (v.timestampValue !== undefined) r[k] = v.timestampValue;
    else if (v.nullValue !== null && v.nullValue !== undefined) r[k] = null;
    else if (v.arrayValue) r[k] = (v.arrayValue.values || []).map((x: any) => x.mapValue ? fromFields(x.mapValue.fields) : x);
    else if (v.mapValue) r[k] = fromFields(v.mapValue.fields);
    else r[k] = v;
  }
  return r;
}

export const FieldValue = { serverTimestamp: () => "_SERVER_TIMESTAMP_" };

let _docIdCounter = 0;
function genId(): string {
  _docIdCounter++;
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id + _docIdCounter;
}

function getProjectId(): string {
  return getCreds().projectId || "my-store-51b02";
}

function docPath(collection: string, docId?: string): string {
  return `projects/${getProjectId()}/databases/(default)/documents/${collection}${docId ? `/${docId}` : ""}`;
}

async function request(method: string, url: string, body?: any): Promise<any> {
  const token = await getAccessToken();
  const resp = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Firestore ${method} ${url.split("/").pop()}: ${text.substring(0, 200)}`);
  }
  if (method === "DELETE") return null;
  return resp.json();
}

export async function getDocument(collection: string, docId: string): Promise<Record<string, any> | null> {
  try {
    const result = await request("GET", `https://firestore.googleapis.com/v1/${docPath(collection, docId)}`);
    return { ...fromFields(result.fields), _id: result.name.split("/").pop() };
  } catch (e: any) {
    if (e.message?.includes("404") || e.message?.includes("NOT_FOUND")) return null;
    throw e;
  }
}

export async function setDocument(collection: string, docId: string, data: Record<string, any>): Promise<void> {
  await request("PATCH", `https://firestore.googleapis.com/v1/${docPath(collection, docId)}`, { fields: toFields(data) });
}

export async function updateDocument(collection: string, docId: string, data: Record<string, any>): Promise<void> {
  const fields = toFields(data);
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
  await request("PATCH", `https://firestore.googleapis.com/v1/${docPath(collection, docId)}?${mask}`, { fields });
}

export interface WriteOp {
  operation: "create" | "set" | "update" | "delete";
  collection: string;
  docId?: string;
  data?: Record<string, any>;
  transforms?: Array<{ fieldPath: string; increment?: number; serverTimestamp?: boolean }>;
}

export async function commit(writes: WriteOp[]): Promise<void> {
  const token = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents:commit`;

  const writesPayload = writes.map(w => {
    const path = docPath(w.collection, w.docId);
    const entry: any = {};

    if (w.operation === "delete") {
      entry.delete = path;
    } else if (w.transforms && w.transforms.length > 0) {
      entry.update = { name: path, fields: toFields(w.data || {}) };
      if (w.operation === "update") entry.updateMask = { fieldPaths: Object.keys(w.data || {}) };
      entry.transform = {
        document: path,
        fieldTransforms: w.transforms.map(t => {
          if (t.serverTimestamp) return { fieldPath: t.fieldPath, setToServerValue: "REQUEST_TIME" };
          if (t.increment !== undefined) return { fieldPath: t.fieldPath, increment: { integerValue: String(t.increment) } };
          return null;
        }).filter(Boolean),
      };
    } else if (w.operation === "create") {
      entry.update = { name: docPath(w.collection, w.docId || genId()), fields: toFields(w.data || {}) };
    } else if (w.operation === "set") {
      entry.update = { name: path, fields: toFields(w.data || {}) };
    } else if (w.operation === "update") {
      entry.update = { name: path, fields: toFields(w.data || {}) };
      entry.updateMask = { fieldPaths: Object.keys(w.data || {}) };
    }

    return entry;
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: writesPayload }),
  });
  if (!resp.ok) throw new Error(`Commit error: ${await resp.text()}`);
}

export async function createRazorpayOrder(amount: number, receipt?: string): Promise<string> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return `order_mock_${Math.random().toString(36).substring(2, 9)}`;
  }
  const basic = btoa(`${keyId}:${keySecret}`);
  const resp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt: receipt || `receipt_${Date.now()}` }),
  });
  if (!resp.ok) throw new Error(`Razorpay error: ${await resp.text()}`);
  const data = await resp.json();
  return data.id;
}

export async function processRazorpayRefund(paymentId: string, amount?: number, reason?: string): Promise<string> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return `rfnd_mock_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }
  const basic = btoa(`${keyId}:${keySecret}`);
  const body: any = {};
  if (amount) body.amount = Math.round(amount * 100);
  if (reason) body.notes = { reason };
  const resp = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Razorpay refund error: ${await resp.text()}`);
  const data = await resp.json();
  return data.id;
}

export async function setCustomClaims(uid: string, claims: Record<string, any>): Promise<void> {
  const webApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!webApiKey) throw new Error("Firebase Web API key not configured");

  const authToken = await getAccessToken("https://www.googleapis.com/auth/identitytoolkit");
  const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${webApiKey}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(claims) }),
  });
  if (!resp.ok) throw new Error(`Set custom claims error: ${await resp.text()}`);
}

export function isAdminReady(): boolean {
  const { clientEmail, privateKey } = getCreds();
  return !!(clientEmail && privateKey);
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes.buffer;
}

export async function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, hexToArrayBuffer(signature), enc.encode(`${orderId}|${paymentId}`));
}
