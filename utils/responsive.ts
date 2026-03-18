// utils/responsive.ts
import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// 1. Identify the "Short" and "Long" sides.
// This ensures your math stays consistent even if the user rotates the phone.
const [shortDimension, longDimension] =
  SCREEN_WIDTH < SCREEN_HEIGHT
    ? [SCREEN_WIDTH, SCREEN_HEIGHT]
    : [SCREEN_HEIGHT, SCREEN_WIDTH];

// 2. Set Base Guidelines (Reference Device)
// These are the dimensions of a standard "modern" phone.
// If your M35 looks perfect, use its specs here (Approx 390x844 for logic).
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// 3. Device Type Check
export const isTablet = shortDimension / longDimension > 0.7; // Typical tablet aspect ratio
export const isSmallPhone = shortDimension < 350; // iPhone SE / Mini style

/**
 * SCALING FUNCTIONS
 */

// s (Scale): For Width, Padding, Margin (Horizontal)
export const s = (size: number) => {
  const scale = shortDimension / guidelineBaseWidth;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// vs (Vertical Scale): For Height, Top/Bottom (Vertical)
export const vs = (size: number) => {
  const scale = longDimension / guidelineBaseHeight;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// ms (Moderate Scale): For Fonts and Border Radius
// This is the "Magic" function. It scales, but at a 50% lower rate.
// This prevents a font from jumping from 16pt to 32pt on a tablet.
export const ms = (size: number, factor = 0.5) => {
  const newSize = size + (s(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// 4. Exporting Raw Dimensions for one-off checks
export { SCREEN_HEIGHT, SCREEN_WIDTH };

