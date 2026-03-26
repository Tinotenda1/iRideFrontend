import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../constants/theme";
import { typedTypography } from "../utils/styles";

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const LegalModal = ({
  visible,
  onClose,
  title,
  content,
}: LegalModalProps) => {
  return (
    <Modal
      animationType="slide"
      visible={visible}
      transparent={false}
      statusBarTranslucent={true} // Allows the modal to sit under the status bar
      onRequestClose={onClose}
    >
      <View style={styles.fullScreenWrapper}>
        <SafeAreaView style={styles.container}>
          {/* --- BRANDED DRIFT HEADER --- */}
          <View style={styles.brandedHeader}>
            <Image
              source={require("../assets/images/drift_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* --- DYNAMIC TITLE SECTION --- */}
          <View style={styles.titleSection}>
            {<Text style={styles.pageTitle}>{title}</Text>}
            <View style={styles.titleUnderline} />
          </View>

          {/* --- CONTENT AREA --- */}
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={true}
          >
            <Markdown style={markdownStyles}>{content}</Markdown>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Wrapper ensures the background color fills the entire screen including notches
  fullScreenWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  brandedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  logo: {
    width: 80,
    height: 30,
  },
  closeButton: {
    padding: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 50,
  },
  titleSection: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  pageTitle: {
    ...typedTypography.h2,
    color: theme.colors.text,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xs,
    borderRadius: 2,
  },
  body: {
    //paddingTop: 20,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 40,
  },
});

const markdownStyles = {
  body: {
    color: theme.colors.text,
    ...typedTypography.body,
    lineHeight: 24,
  },
  heading2: {
    color: theme.colors.primary,
    marginTop: 20,
    marginBottom: 10,
    ...typedTypography.h2,
  },
};
