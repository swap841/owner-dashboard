const REVALIDATE_URL = process.env.NEXT_PUBLIC_REVALIDATE_URL || "https://customer-website-1.onrender.com/api/revalidate";
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || process.env.NEXT_PUBLIC_REVALIDATE_SECRET || "";

export async function triggerRevalidation(paths: string[]): Promise<boolean> {
  if (!REVALIDATE_SECRET) {
    console.warn("[Revalidate] No REVALIDATE_SECRET set. Skipping revalidation.");
    return false;
  }

  try {
    const res = await fetch(REVALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths, secret: REVALIDATE_SECRET }),
    });

    const data = await res.json();
    if (data.revalidated) {
      console.log("[Revalidate] Success:", data.revalidatedPaths);
      return true;
    }
    console.warn("[Revalidate] Failed:", data);
    return false;
  } catch (err) {
    console.error("[Revalidate] Error:", err);
    return false;
  }
}
