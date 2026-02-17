import { getUserInfo } from "./storage";

export const submitUserRating = async (
  targetType: "driver" | "passenger",
  targetPhone: string,
  rideId: string,
  rating: number,
  comment: string,
) => {
  try {
    // --- Internal Loading & Logic ---
    // Fetch the submitter's info directly inside the utility
    const userInfo = await getUserInfo();
    const submitterPhone = userInfo?.phone;

    if (!submitterPhone) {
      console.error("❌ Rating failed: No submitter phone found in storage.");
      return false;
    }

    console.log("🚀 Submitting rating internally:", {
      submitter: submitterPhone,
      target: targetPhone,
      rideId,
      comment,
    });

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/submit_rating`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId: targetPhone,
          rideId,
          rating,
          comment,
          userPhone: String(submitterPhone).replace(/\D/g, ""), // Handled internally
        }),
      },
    );

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("❌ Rating Submission Error:", error);
    return false;
  }
};
