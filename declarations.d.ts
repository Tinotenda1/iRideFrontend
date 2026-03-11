// declarations.d.ts
declare module "react-native-floating-bubble" {
  export function initialize(): void;
  export function requestPermission(): Promise<void>;
  export function showFloatingBubble(x?: number, y?: number): Promise<void>;
  export function hideFloatingBubble(): Promise<void>;
  export function checkPermission(): Promise<boolean>;
}
