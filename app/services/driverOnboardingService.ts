// services/driverOnboardingService.ts
import { api } from "@/utils/api"; // Use your central axios instance
import { getUserInfo, UserInfo } from "@/utils/storage";
import { Platform } from "react-native";

// ... existing imports ...

export const submitDriverOnboarding = async (
  userInfo: UserInfo,
  onProgress: (percent: number) => void,
) => {
  const formData = new FormData();

  // 1. Get the latest stored info (for phone)
  const fullStoredInfo = await getUserInfo();
  const phone = fullStoredInfo?.phone;

  // 2. Append Text Fields - ADDED vehicleType HERE
  const textFields = [
    "name",
    "city",
    "idNumber",
    "plateNumber",
    "vehicleYear",
    "makeModel",
    "vehicleColor",
    "vehicleType", // <--- CRITICAL MISSING FIELD
    "userType",
  ];

  textFields.forEach((field) => {
    const value = userInfo[field as keyof UserInfo];
    // Special handling for vehicleType to ensure it's a string
    if (value !== undefined && value !== null) {
      formData.append(field, String(value));
    }
  });

  // 3. Append Phone
  if (phone) {
    formData.append("phone", String(phone));
  }

  // 4. Append Image Files
  // Ensure these keys match getFileUrl('key') in your Node.js controller
  const imageFields = [
    { key: "profile_pic", uri: userInfo.profilePic },
    { key: "national_id", uri: userInfo.nationalIdImage },
    { key: "license_front", uri: userInfo.licenseFront },
    { key: "license_back", uri: userInfo.licenseBack },
    { key: "reg_book", uri: userInfo.regBookImage },
    { key: "car_front", uri: userInfo.carFront },
    { key: "car_back", uri: userInfo.carBack },
    { key: "car_angle", uri: userInfo.carAngle },
  ];

  imageFields.forEach((img) => {
    if (img.uri) {
      const filename = img.uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append(img.key, {
        uri: Platform.OS === "ios" ? img.uri.replace("file://", "") : img.uri,
        name: filename || `image_${img.key}.jpg`,
        type,
      } as any);
    }
  });

  // 5. Submit
  return api.post("/drivers/onboarding", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90000, // Increased to 90s for multiple compressed images
    onUploadProgress: (progressEvent) => {
      const total = progressEvent.total || 1;
      const current = progressEvent.loaded || 0;
      onProgress(Math.round((current * 100) / total));
    },
  });
};
