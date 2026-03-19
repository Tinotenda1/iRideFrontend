// utils/responsive.ts
import { Dimensions, PixelRatio, Platform, StatusBar } from "react-native";

// Use "screen" to get the absolute physical size of the glass
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("screen");

// Calculate the actual usable height (handling the Android Status Bar)
const ACTUAL_HEIGHT =
  Platform.OS === "android"
    ? SCREEN_HEIGHT - (StatusBar.currentHeight || 0)
    : SCREEN_HEIGHT;

const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/** * HP (Height Percentage): Use this for Trays and Modals
 * This ensures 50% is ALWAYS 50% regardless of the phone height.
 */
export const hp = (percentage: number) => {
  return Math.round(
    PixelRatio.roundToNearestPixel((ACTUAL_HEIGHT * percentage) / 100),
  );
};

/** * WP (Width Percentage): Use this for full-width sections
 */
export const wp = (percentage: number) => {
  return Math.round(
    PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100),
  );
};

export const s = (size: number) => {
  const scale = SCREEN_WIDTH / guidelineBaseWidth;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

export const vs = (size: number) => {
  const scale = ACTUAL_HEIGHT / guidelineBaseHeight;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

export const ms = (size: number, factor = 0.5) => {
  const newSize = size + (s(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export { SCREEN_HEIGHT, SCREEN_WIDTH };

