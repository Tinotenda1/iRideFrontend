import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const DriverRevenue: React.FC<Props> = ({ title, icon = "car-sport-outline" }) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={70} color={theme.colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Content coming soon...</Text>
    </View>
  );
};

export default DriverRevenue;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#fafafa",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: theme.spacing.xs,
  },
});
