import { getCloudinary } from "../config/cloudinary.js";

export function uploadImage(imageBuffer) {
  const cloudinary = getCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "netra/history", resource_type: "image", format: "jpg" },
      (error, result) => {
        if (error || !result?.secure_url || !result?.public_id) {
          reject(
            error ??
              new Error("Cloudinary returned an incomplete upload result."),
          );
          return;
        }
        resolve({
          imageUrl: result.secure_url,
          imagePublicId: result.public_id,
        });
      },
    );
    stream.end(imageBuffer);
  });
}

export async function deleteImage(publicId) {
  if (!publicId) return;
  await getCloudinary().uploader.destroy(publicId, { resource_type: "image" });
}
