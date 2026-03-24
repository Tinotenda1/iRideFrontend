import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../../constants/theme";
import { ms, s, vs } from "../../../../utils/responsive";
import { createStyles } from "../../../../utils/styles";

interface VehicleTabProps {
  plateNumber: string;
  year: string;
  makeModel: string;
  color: string;
  regBookImage: string | null;
  carFront: string | null;
  carBack: string | null;
  carAngle: string | null;

  setPlateNumber: (val: string) => void;
  setYear: (val: string) => void;
  setMakeModel: (val: string) => void;
  setColor: (val: string) => void;
  setRegBookImage: (uri: string | null) => void;
  setCarFront: (uri: string | null) => void;
  setCarBack: (uri: string | null) => void;
  setCarAngle: (uri: string | null) => void;

  plateTrayRef: any;
  yearTrayRef: any;
  makeModelTrayRef: any;
  colorTrayRef: any;
}

export const VehicleTab = ({
  plateNumber,
  year,
  makeModel,
  color,
  regBookImage,
  carFront,
  carBack,
  carAngle,
  setRegBookImage,
  setCarFront,
  setCarBack,
  setCarAngle,
  plateTrayRef,
  yearTrayRef,
  makeModelTrayRef,
  colorTrayRef,
}: VehicleTabProps) => {
  // Inside VehicleTab component...

  const handlePickImage = async (setter: (uri: string | null) => void) => {
    Alert.alert(
      "Select Image",
      "Choose a source for your vehicle document/photo",
      [
        {
          text: "Camera",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.7,
            });
            if (!result.canceled) setter(result.assets[0].uri);
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.7,
            });
            if (!result.canceled) setter(result.assets[0].uri);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );
  };

  const InputItem = ({ label, value, placeholder, onPress, icon }: any) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.inputField} onPress={onPress}>
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <Ionicons
          name={icon}
          size={ms(18)}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );

  const PhotoBox = ({ uri, label, onPress, icon }: any) => (
    <TouchableOpacity style={styles.photoBox} onPress={onPress}>
      {uri ? (
        <Image source={{ uri }} style={styles.fullImage} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name={icon} size={ms(24)} color={theme.colors.primary} />
          <Text style={styles.photoLabel}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 1. Plate Number & 2. Year */}
      <View style={styles.row}>
        <View style={{ flex: 1.5, marginRight: s(8) }}>
          <InputItem
            label="License Plate"
            value={plateNumber}
            placeholder="ABC-1234"
            icon="card-outline"
            onPress={() => plateTrayRef.current?.open()}
          />
        </View>
        <View style={{ flex: 1, marginLeft: s(8) }}>
          <InputItem
            label="Year"
            value={year}
            placeholder="2024"
            icon="calendar-outline"
            onPress={() => yearTrayRef.current?.open()}
          />
        </View>
      </View>

      {/* 3. Make & Model */}
      <InputItem
        label="Make and Model"
        value={makeModel}
        placeholder="e.g. Toyota Aqua"
        icon="car-outline"
        onPress={() => makeModelTrayRef.current?.open()}
      />

      {/* 4. Color */}
      <InputItem
        label="Vehicle Color"
        value={color}
        placeholder="e.g. Silver"
        icon="color-palette-outline"
        onPress={() => colorTrayRef.current?.open()}
      />

      {/* 5. Registration Book */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Vehicle Registration Book</Text>
        <TouchableOpacity
          style={styles.regBookCard}
          onPress={() => handlePickImage(setRegBookImage)}
        >
          {regBookImage ? (
            <Image source={{ uri: regBookImage }} style={styles.fullImage} />
          ) : (
            <View style={styles.regPlaceholder}>
              <Ionicons
                name="document-text-outline"
                size={ms(30)}
                color={theme.colors.primary}
              />
              <Text style={styles.uploadText}>Upload Reg Book</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 6. Vehicle Pictures */}
      <Text style={styles.inputLabel}>Vehicle Photos (Required)</Text>
      <View style={styles.photoRow}>
        <PhotoBox
          label="Front"
          uri={carFront}
          icon="eye-outline"
          onPress={() => handlePickImage(setCarFront)}
        />
        <PhotoBox
          label="Back"
          uri={carBack}
          icon="arrow-back-outline"
          onPress={() => handlePickImage(setCarBack)}
        />
        <PhotoBox
          label="Angle"
          uri={carAngle}
          icon=" camera-reverse-outline"
          onPress={() => handlePickImage(setCarAngle)}
        />
      </View>
    </View>
  );
};

const styles = createStyles({
  container: { flex: 1, paddingTop: vs(10) },
  row: { flexDirection: "row" },
  inputGroup: { marginBottom: vs(18) },
  inputLabel: {
    fontSize: ms(14),
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: vs(8),
    marginLeft: s(4),
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.background,
    borderRadius: ms(15),
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputText: { fontSize: ms(15), color: theme.colors.text },
  placeholderText: { color: theme.colors.textSecondary },

  regBookCard: {
    height: vs(100),
    backgroundColor: theme.colors.background,
    borderRadius: ms(15),
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  regPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  uploadText: {
    fontSize: ms(12),
    color: theme.colors.primary,
    marginTop: vs(4),
    fontWeight: "600",
  },

  photoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vs(5),
  },
  photoBox: {
    width: "31%",
    height: vs(90),
    backgroundColor: theme.colors.background,
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  photoPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  photoLabel: {
    fontSize: ms(10),
    color: theme.colors.textSecondary,
    marginTop: vs(2),
  },
  fullImage: { width: "100%", height: "100%", resizeMode: "cover" },
});
