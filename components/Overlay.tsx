// components/Overlay.tsx
import React from 'react';
import { Animated, TouchableOpacity } from 'react-native';

interface OverlayProps {
  isVisible: boolean;
  onPress: () => void;
}

export default function Overlay({ isVisible, onPress }: OverlayProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Only stop rendering after fade out completes
        if (!isVisible) {
          setShouldRender(false);
        }
      });
    }
  }, [isVisible, fadeAnim]);

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        zIndex: 19999, // Just below Sidebar (20000) but above everything else
        elevation: 99, // Just below Sidebar for Android
        opacity: fadeAnim,
      }}
    >
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={onPress}
        activeOpacity={1}
      />
    </Animated.View>
  );
}