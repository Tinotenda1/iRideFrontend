// components/RatingModal.tsx
import { theme } from "@/constants/theme";
import { ms, s, vs } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { IRAvatar } from "./IRAvatar";
import { IRButton } from "./IRButton";

interface RatingModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  userName?: string;
  userImage?: string;
  onSelectRating: (rating: number, comment: string) => void;
  isLoading?: boolean;
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  title,
  subtitle,
  userName,
  userImage,
  onSelectRating,
  isLoading = false,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (rating === 0) return;
    onSelectRating(rating, comment);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <Text style={styles.title}>{title}</Text>

              {/* User Profile Section */}
              <View style={styles.profileSection}>
                <View style={styles.imageWrapper}>
                  <IRAvatar
                    source={userImage ? { uri: userImage } : undefined}
                    name={userName}
                    size={ms(84)}
                  />
                </View>
                {userName && (
                  <Text style={styles.userNameText}>{userName}</Text>
                )}
              </View>

              <Text style={styles.subtitle}>{subtitle}</Text>

              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={rating >= star ? "star" : "star-outline"}
                      size={ms(42)}
                      color={rating >= star ? "#FFC107" : "#E2E8F0"}
                      style={styles.star}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, isLoading && { opacity: 0.6 }]}
                placeholder="Tell us more about your experience..."
                placeholderTextColor="#94a3b8"
                multiline
                value={comment}
                onChangeText={setComment}
                editable={!isLoading}
              />

              <View style={styles.footer}>
                <IRButton
                  title="Submit Rating"
                  variant="primary"
                  onPress={handleSubmit}
                  loading={isLoading}
                  disabled={rating === 0}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default RatingModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)", // Drift standard dark overlay
    justifyContent: "center",
    alignItems: "center",
    padding: s(20),
  },
  keyboardView: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: ms(32),
    padding: s(24),
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  title: {
    fontSize: ms(20),
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: vs(20),
    textAlign: "center",
  },
  profileSection: {
    alignItems: "center",
    marginBottom: vs(15),
  },
  imageWrapper: {
    width: ms(90),
    height: ms(90),
    borderRadius: ms(45),
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  userNameText: {
    fontSize: ms(18),
    fontWeight: "700",
    color: "#1e293b",
    marginTop: vs(10),
  },
  subtitle: {
    fontSize: ms(14),
    color: "#64748b",
    textAlign: "center",
    marginBottom: vs(24),
  },
  starRow: {
    flexDirection: "row",
    marginBottom: vs(24),
  },
  star: {
    marginHorizontal: s(4),
  },
  input: {
    width: "100%",
    backgroundColor: theme.colors.background,
    borderRadius: ms(16),
    padding: s(16),
    height: vs(100),
    textAlignVertical: "top",
    fontSize: ms(15),
    color: "#1e293b",
    marginBottom: vs(24),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  footer: {
    width: "100%",
  },
});
