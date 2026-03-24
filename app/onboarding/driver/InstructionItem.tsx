import { theme } from "@/constants/theme";
import { ms, s, vs } from "@/utils/responsive";
import React from "react";
import { Text, View } from "react-native";

export const InstructionItem = ({
  number,
  text,
}: {
  number: number;
  text: string;
}) => (
  <View
    style={{ flexDirection: "row", alignItems: "center", marginBottom: vs(16) }}
  >
    <View
      style={{
        width: ms(28),
        height: ms(28),
        borderRadius: ms(14),
        backgroundColor: theme.colors.background,
        justifyContent: "center",
        alignItems: "center",
        marginRight: s(12),
      }}
    >
      <Text
        style={{
          ...(theme.typography.caption as any),
          color: theme.colors.primaryDark,
        }}
      >
        {number}
      </Text>
    </View>
    <Text
      style={{
        ...(theme.typography.bodySmall as any),
        color: theme.colors.textSecondary,
        flex: 1,
      }}
    >
      {text}
    </Text>
  </View>
);
