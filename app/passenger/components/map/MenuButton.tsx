// components/map/MenuButton.tsx
import { ms } from "@/utils/responsive"; // Added responsiveness utility
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity } from "react-native";
import { theme } from "../../../../constants/theme";
import { createStyles } from "../../../../utils/styles";

interface MenuButtonProps {
  onPress: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.menuButton} onPress={onPress}>
      <Ionicons name="menu" size={ms(24)} color={theme.colors.text} />
    </TouchableOpacity>
  );
};

const styles = createStyles({
  menuButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadows.sm,
  },
});

export default MenuButton;
