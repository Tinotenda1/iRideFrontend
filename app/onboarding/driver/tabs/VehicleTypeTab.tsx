import React, { useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const VEHICLE_OPTIONS = [
  { id: "4seater", label: "5 Seater", img: require("@/assets/cars/4seat.png") },
  { id: "7seater", label: "7 Seater", img: require("@/assets/cars/7seat.png") },
  {
    id: "pickup2seater",
    label: "Single Cab Pickup",
    img: require("@/assets/cars/pickup2.png"),
  },
  {
    id: "pickup4seater",
    label: "Double Cab Pickup",
    img: require("@/assets/cars/pickup4.png"),
  },
];

// 1. Defined the Interface to match what the parent is sending
interface VehicleTypeTabProps {
  onTypeChange: (val: string) => void;
  initialValue: string;
}

export const VehicleTypeTab = ({
  onTypeChange,
  initialValue,
}: VehicleTypeTabProps) => {
  // 2. Initialize state by splitting the comma-separated string
  // We filter(Boolean) to handle empty strings gracefully
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    initialValue ? initialValue.split(",").filter(Boolean) : [],
  );

  const toggleType = (id: string) => {
    const newSelection = selectedTypes.includes(id)
      ? selectedTypes.filter((t) => t !== id)
      : [...selectedTypes, id];

    setSelectedTypes(newSelection);

    // 3. Send the joined string back to the parent (DriverOnboarding)
    onTypeChange(newSelection.join(","));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Select Vehicle Capabilities</Text>
      <Text style={styles.subtitle}>You can select multiple if applicable</Text>

      <View style={styles.grid}>
        {VEHICLE_OPTIONS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.card,
              selectedTypes.includes(item.id) && styles.selectedCard,
            ]}
            onPress={() => toggleType(item.id)}
          >
            <Image
              source={item.img}
              style={styles.carImage}
              resizeMode="contain"
            />
            <Text style={styles.cardLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 20 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: { borderColor: "#000", backgroundColor: "#fff" },
  carImage: { width: 80, height: 50, marginBottom: 10 },
  cardLabel: { fontSize: 12, fontWeight: "600", textAlign: "center" },
});
