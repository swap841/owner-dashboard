// lib/imageUpload.ts
// SECURITY: This file now proxies through a server-side API route.
// The ImgBB API key is stored server-side in the Next.js API route
// or Cloud Functions config, never exposed to the client.

/**
 * Uploads a file to ImgBB via the server-side proxy and returns its direct URL.
 * Calls POST /api/upload-photo which forwards to ImgBB with the server-side key.
 */
export async function uploadToImgBB(file: File): Promise<string> {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error("File is too large. Maximum allowed size is 10MB.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid file type. Please upload an image file (PNG, JPG, JPEG, WEBP, GIF).");
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch("/api/upload-photo", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `HTTP error ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.url) {
      return data.url;
    } else {
      throw new Error(data.error?.message || "Upload returned unsuccessful response.");
    }
  } catch (error: any) {
    console.error("Upload Exception:", error);
    throw new Error(error.message || "Failed to upload image.");
  }
}
