import * as ImageManipulator from "expo-image-manipulator";

interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

/**
 * Compresses an image to a reasonable size for server uploads.
 * Targets ~200kb - 500kb per image while maintaining legibility for IDs.
 */
export const compressImage = async (uri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        // Resize the long edge to 1200px (standard for document/car clarity)
        // This maintains the aspect ratio automatically
        { resize: { width: 1200 } },
      ],
      {
        compress: 0.7, // 70% quality is the "sweet spot" for JPEG
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    console.log(
      `📸 Image Compressed: ${uri.split("/").pop()} -> ${result.uri.split("/").pop()}`,
    );
    return result.uri;
  } catch (error) {
    console.error("Compression Error:", error);
    return uri; // Fallback to original if compression fails
  }
};

/**
 * Batch compress an array of URIs (useful for the Vehicle Tab)
 */
export const compressMultipleImages = async (
  uris: (string | null)[],
): Promise<(string | null)[]> => {
  const compressed = await Promise.all(
    uris.map(async (uri) => {
      if (!uri) return null;
      return await compressImage(uri);
    }),
  );
  return compressed;
};
