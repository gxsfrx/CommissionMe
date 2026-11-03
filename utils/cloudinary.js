export const uploadToCloudinary = async (imageUri) => {
  if (!imageUri) return null;

  const CLOUD_NAME = "YOUR_CLOUD_NAME";
  const UPLOAD_PRESET = "YOUR_UNSIGNED_UPLOAD_PRESET";

  const data = new FormData();

  data.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "upload.jpg",
  });
  data.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: data,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const result = await response.json();
    if (result.secure_url) {
      return result.secure_url; // Permanent HTTP image URL
    } else {
      console.log("Cloudinary Upload Error:", result);
      return null;
    }
  } catch (error) {
    console.log("Error uploading image to Cloudinary:", error);
    return null;
  }
};
