// components/map/MenuButton.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { theme } from '../../constants/theme';
import { createStyles } from '../../utils/styles';

interface MenuButtonProps {
  onPress: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.menuButton} onPress={onPress}>
      <Ionicons name="menu" size={24} color={theme.colors.text} />
    </TouchableOpacity>
  );
};

const styles = createStyles({
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
});

export default MenuButton;
