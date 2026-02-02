// utils/ratingSubmittion.ts
export const submitUserRating = async (
  targetType: "driver" | "passenger",
  targetId: string,
  rideId: string,
  rating: number,
  comment: string,
) => {
  console.log("Submitting rating:", {
    targetType,
    targetId,
    rideId,
    rating,
    comment,
  });
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/submit_rating`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType, // Who is receiving the rating
          targetId, // Their identifier
          rideId, // The trip reference
          rating,
          comment,
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
