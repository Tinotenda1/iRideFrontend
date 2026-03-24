import { getApiBaseUrl } from "./api";

export const getProfileImageSource = (path: string | null | undefined) => {
  // 1. Handle empty states
  if (!path) {
    return require("../assets/images/default-avatar.png");
  }

  // 2. Handle local URI (Images just picked via Camera/Gallery)
  if (path.startsWith("file://") || path.startsWith("content://")) {
    return { uri: path };
  }

  // 3. Handle Server Paths
  // Your getApiBaseUrl() returns "http://192.168.x.x:5000"
  // Your path looks like "/uploads/profile-pics/profile_1_123.jpg"
  const baseUrl = getApiBaseUrl();
  return { uri: `${baseUrl}${path}` };
};
