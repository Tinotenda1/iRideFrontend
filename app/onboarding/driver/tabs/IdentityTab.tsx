// app/onboarding/driver/tabs/IdentityTab.tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../../constants/theme";
import { ms, s, vs } from "../../../../utils/responsive";
import { createStyles } from "../../../../utils/styles";

interface IdentityTabProps {
  idNumber: string;
  nationalIdImage: string | null;
  licenseFront: string | null;
  licenseBack: string | null;
  setIdNumber: (val: string) => void;
  setNationalIdImage: (uri: string | null) => void;
  setLicenseFront: (uri: string | null) => void;
  setLicenseBack: (uri: string | null) => void;
  idNumberTrayRef: any;
}

export const IdentityTab = ({
  idNumber,
  nationalIdImage,
  licenseFront,
  licenseBack,
  setNationalIdImage,
  setLicenseFront,
  setLicenseBack,
  idNumberTrayRef,
}: IdentityTabProps) => {
  const handlePickImage = async (setter: (uri: string | null) => void) => {
    Alert.alert("Upload Document", "Choose a source", [
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
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const DocumentCard = ({
    label,
    uri,
    onPress,
  }: {
    label: string;
    uri: string | null;
    onPress: () => void;
  }) => (
    <View style={styles.docContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity style={styles.docPicker} onPress={onPress}>
        {uri ? (
          <Image source={{ uri }} style={styles.docImage} />
        ) : (
          <View style={styles.docPlaceholder}>
            <Ionicons
              name="camera"
              size={ms(32)}
              color={theme.colors.primary}
            />
            <Text style={styles.docPlaceholderText}>Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 1. National ID Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>National ID Number</Text>
        <TouchableOpacity
          style={styles.inputField}
          onPress={() => idNumberTrayRef.current?.open()}
        >
          <Text style={[styles.inputText, !idNumber && styles.placeholderText]}>
            {idNumber || "Enter ID Number"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. National ID Image (Front Only) */}
      <DocumentCard
        label="National ID (Front)"
        uri={nationalIdImage}
        onPress={() => handlePickImage(setNationalIdImage)}
      />

      {/* 3. Driver's License (Both Sides) */}
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: s(8) }}>
          <DocumentCard
            label="License (Front)"
            uri={licenseFront}
            onPress={() => handlePickImage(setLicenseFront)}
          />
        </View>
        <View style={{ flex: 1, marginLeft: s(8) }}>
          <DocumentCard
            label="License (Back)"
            uri={licenseBack}
            onPress={() => handlePickImage(setLicenseBack)}
          />
        </View>
      </View>
    </View>
  );
};

const styles = createStyles({
  container: { flex: 1, paddingTop: vs(10) },
  inputGroup: { marginBottom: vs(20) },
  inputLabel: {
    fontSize: ms(14),
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: vs(8),
    marginLeft: s(4),
  },
  inputField: {
    backgroundColor: theme.colors.background,
    borderRadius: ms(50),
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputText: { fontSize: ms(16), color: theme.colors.text },
  placeholderText: { color: theme.colors.textSecondary },

  docContainer: { marginBottom: vs(20) },
  docPicker: {
    height: vs(120),
    backgroundColor: theme.colors.background,
    borderRadius: ms(15),
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  docPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  docPlaceholderText: {
    fontSize: ms(12),
    color: theme.colors.textSecondary,
    marginTop: vs(4),
  },
  docImage: { width: "100%", height: "100%", resizeMode: "cover" },
  row: { flexDirection: "row", justifyContent: "space-between" },
});
