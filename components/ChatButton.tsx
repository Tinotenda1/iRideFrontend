// components/ChatButton.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { createStyles } from '../utils/styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 56;

const ChatButton: React.FC = () => {
  const [hasUnread, setHasUnread] = useState(true);
  const insets = useSafeAreaInsets();

  // Calculate safe area boundaries
  const SAFE_AREA = {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  };

  // Initial position - bottom right, within safe area
  const initialX = SCREEN_WIDTH - BUTTON_SIZE - SAFE_AREA.right - 16;
  const initialY = SCREEN_HEIGHT - BUTTON_SIZE - SAFE_AREA.bottom - 16;

  const position = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Move button based on gesture, keeping it within safe area
        let newX = gestureState.moveX - (BUTTON_SIZE / 2); // Center button on finger
        let newY = gestureState.moveY - (BUTTON_SIZE / 2);

        // Clamp values to safe area bounds
        newX = Math.max(SAFE_AREA.left, Math.min(SCREEN_WIDTH - BUTTON_SIZE - SAFE_AREA.right, newX));
        newY = Math.max(SAFE_AREA.top, Math.min(SCREEN_HEIGHT - BUTTON_SIZE - SAFE_AREA.bottom, newY));

        position.setValue({ x: newX, y: newY });
      },
      onPanResponderRelease: () => {
        // Optionally, snap to edges or leave as is
      },
    })
  ).current;

  const handlePress = () => {
    console.log('Open chat');
    setHasUnread(false);
    // Navigate to chat screen later
  };

  return (
    <Animated.View
      style={[
        styles.container, 
        { 
          transform: position.getTranslateTransform(),
          zIndex: 10000, // Higher than everything else
        }
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={styles.chatButton} onPress={handlePress}>
        <Ionicons name="chatbubble-ellipses" size={24} color={theme.colors.primary} />
        {hasUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = createStyles({
  container: {
    position: 'absolute',
  },
  chatButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
});

export default ChatButton;