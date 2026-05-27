// lib/imageUpload.ts

const DEFAULT_IMGBB_API_KEY = "810178a2497b6ece3e065022d318e6c6";

/**
 * Uploads a file to ImgBB and returns its direct URL.
 * Falls back to a predefined public key if the environment variable is not defined.
 */
export async function uploadToImgBB(file: File): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || DEFAULT_IMGBB_API_KEY;

  if (!apiKey || apiKey === "YOUR_IMGBB_API_KEY_HERE") {
    throw new Error("ImgBB API key is missing. Please set NEXT_PUBLIC_IMGBB_API_KEY in your .env.local file.");
  }

  // Validate file size (limit: 10MB)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error("File is too large. Maximum allowed size is 10MB.");
  }

  // Validate file type (must be an image)
  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid file type. Please upload an image file (PNG, JPG, JPEG, WEBP, GIF).");
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `HTTP error ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.data?.url) {
      return data.data.url;
    } else {
      throw new Error(data.error?.message || "ImgBB upload returned unsuccessful response.");
    }
  } catch (error: any) {
    console.error("ImgBB Upload Exception:", error);
    throw new Error(error.message || "Failed to upload image to ImgBB.");
  }
}
