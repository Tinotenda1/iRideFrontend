import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { hp, ms, s, vs } from "@/utils/responsive";
import { createStyles } from "@/utils/styles";
import { IRButton } from "../../../components/IRButton";
import { ROUTES } from "../../../utils/routes";

// ---------- Tabs ----------
import {
  compressImage,
  compressMultipleImages,
} from "@/utils/imageCompression";
import { getUserInfo, updateUserInfo } from "@/utils/storage";
import InputTray from "../../../components/universalInputTray";
import { IdentityTab } from "./tabs/IdentityTab";
import InformationTab from "./tabs/InformationTab";
import { SubmitTab } from "./tabs/SubmitTab";
import { VehicleTab } from "./tabs/VehicleTab"; // Import the new tab
import { VehicleTypeTab } from "./tabs/VehicleTypeTab";
import { WelcomeTab } from "./tabs/WelcomeTab";

import TripStatusModal from "../../../components/TripStatusModal";
import { submitDriverOnboarding } from "../../services/driverOnboardingService";

/* -------------------------------- Types & Data ---------------------------- */
type OnboardingStep =
  | "welcome"
  | "information"
  | "identity"
  | "vehicle"
  | "vehicleType"
  | "submit";
interface StepContent {
  title: string;
  subtitle: string;
}

const STEP_ORDER: OnboardingStep[] = [
  "welcome",
  "information",
  "identity",
  "vehicle",
  "vehicleType",
  "submit",
];

const STEPS: Record<OnboardingStep, StepContent> = {
  welcome: {
    title: "Welcome",
    subtitle:
      "Complete these steps to start Drifting and earning on your own schedule.",
  },
  information: {
    title: "Personal Information",
    subtitle:
      "We need to verify your identity to ensure every Drift is secure.",
  },
  identity: {
    title: "National Identification",
    subtitle: "Upload your identification to be authorized as a Drift partner.",
  },
  vehicle: {
    title: "Vehicle Details",
    subtitle:
      "Provide your vehicle specs to ensure a premium Drift experience.",
  },
  vehicleType: {
    title: "Vehicle Capabilities",
    subtitle: "Select the categories that best describe how you'll Drift.",
  },
  submit: {
    title: "Registration Completion",
    subtitle: "Ready to become a Drift partner? We cant wait to see you drift.",
  },
};

/* -------------------------------------------------------------------------- */
const DriverOnboarding = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");

  // ---------- Lifted State: Information ----------
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  // ---------- Lifted State: Identity ----------
  const [idNumber, setIdNumber] = useState("");
  const [nationalIdImage, setNationalIdImage] = useState<string | null>(null);
  const [licenseFront, setLicenseFront] = useState<string | null>(null);
  const [licenseBack, setLicenseBack] = useState<string | null>(null);

  // ---------- Lifted State: Vehicle ----------
  const [plateNumber, setPlateNumber] = useState("");
  const [year, setYear] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [color, setColor] = useState("");
  const [regBookImage, setRegBookImage] = useState<string | null>(null);
  const [carFront, setCarFront] = useState<string | null>(null);
  const [carBack, setCarBack] = useState<string | null>(null);
  const [carAngle, setCarAngle] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false); // Add this

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: "completion" | "cancellation";
    title: string;
    message: string;
  }>({
    type: "completion",
    title: "",
    message: "",
  });

  // ---------- Refs for Trays ----------
  const fullNameTrayRef = useRef<any>(null);
  const cityTrayRef = useRef<any>(null);
  const idNumberTrayRef = useRef<any>(null);
  const plateTrayRef = useRef<any>(null);
  const yearTrayRef = useRef<any>(null);
  const makeModelTrayRef = useRef<any>(null);
  const colorTrayRef = useRef<any>(null);

  const currentIndex = STEP_ORDER.indexOf(currentStep);

  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const userInfo = await getUserInfo();
        if (userInfo) {
          // --- Information Tab ---
          if (userInfo.name) setName(userInfo.name);
          if (userInfo.city) setCity(userInfo.city);
          if (userInfo.profilePic) setProfileImage(userInfo.profilePic);

          // --- Identity Tab ---
          if (userInfo.idNumber) setIdNumber(userInfo.idNumber);
          if (userInfo.nationalIdImage)
            setNationalIdImage(userInfo.nationalIdImage);
          if (userInfo.licenseFront) setLicenseFront(userInfo.licenseFront);
          if (userInfo.licenseBack) setLicenseBack(userInfo.licenseBack);

          // --- Vehicle Tab ---
          if (userInfo.plateNumber) setPlateNumber(userInfo.plateNumber);
          if (userInfo.vehicleYear) setYear(userInfo.vehicleYear);
          if (userInfo.makeModel) setMakeModel(userInfo.makeModel);
          if (userInfo.vehicleColor) setColor(userInfo.vehicleColor);
          if (userInfo.regBookImage) setRegBookImage(userInfo.regBookImage);
          if (userInfo.carFront) setCarFront(userInfo.carFront);
          if (userInfo.carBack) setCarBack(userInfo.carBack);
          if (userInfo.carAngle) setCarAngle(userInfo.carAngle);

          // ---Vehicle Type Tab
          if (userInfo.vehicleType) setVehicleType(userInfo.vehicleType);
        }
      } catch (error) {
        console.error("Error loading persisted onboarding data:", error);
      }
    };

    loadExistingData();
  }, []);

  const handleFinish = async () => {
    setIsSubmitting(true);
    setUploadProgress(0); // Reset progress

    try {
      const userInfo = await getUserInfo();
      if (!userInfo) throw new Error("No user data found");

      // Pass the setUploadProgress function as the callback
      await submitDriverOnboarding(userInfo, (percent) => {
        setUploadProgress(percent);
      });

      setModalConfig({
        type: "completion",
        title: "All Set!",
        message:
          "Your registration has been submitted. We'll review your details within 24-48 hours.",
      });
      setShowStatusModal(true);
    } catch (error) {
      setModalConfig({
        type: "cancellation",
        title: "Upload Failed",
        message:
          "We couldn't upload your documents. Please check your internet connection.",
      });
      setShowStatusModal(true);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleModalClose = () => {
    setShowStatusModal(false);
    if (modalConfig.type === "completion") {
      // On success, go back to passenger home
      router.replace(ROUTES.PASSENGER.HOME);
    }
    // On cancellation (error), we stay on the submit tab so they can "Try Again"
  };

  const handleNext = async () => {
    try {
      let dataToSave: any = {};

      switch (currentStep) {
        case "information":
          // Compress profile picture
          const compressedProfile = profileImage
            ? await compressImage(profileImage)
            : undefined;
          dataToSave = {
            profilePic: compressedProfile,
            name,
            city,
          };
          break;

        case "identity":
          // Batch compress identity documents
          const [compNational, compLicFront, compLicBack] =
            await compressMultipleImages([
              nationalIdImage,
              licenseFront,
              licenseBack,
            ]);

          dataToSave = {
            idNumber,
            nationalIdImage: compNational || undefined,
            licenseFront: compLicFront || undefined,
            licenseBack: compLicBack || undefined,
          };
          break;

        case "vehicle":
          // Batch compress all vehicle and registration photos
          const [compReg, compCarFront, compCarBack, compCarAngle] =
            await compressMultipleImages([
              regBookImage,
              carFront,
              carBack,
              carAngle,
            ]);

          dataToSave = {
            plateNumber,
            vehicleYear: year,
            makeModel,
            vehicleColor: color,
            regBookImage: compReg || undefined,
            carFront: compCarFront || undefined,
            carBack: compCarBack || undefined,
            carAngle: compCarAngle || undefined,
          };
          break;

        case "vehicleType":
          dataToSave = {
            vehicleType,
          };
          break;

        case "submit":
          dataToSave = { profileCompleted: true };
          break;

        default:
          break;
      }

      if (Object.keys(dataToSave).length > 0) {
        await updateUserInfo(dataToSave);

        // Update local state with compressed URIs to keep UI in sync
        if (currentStep === "information" && dataToSave.profilePic)
          setProfileImage(dataToSave.profilePic);
        if (currentStep === "identity") {
          if (dataToSave.nationalIdImage)
            setNationalIdImage(dataToSave.nationalIdImage);
          if (dataToSave.licenseFront) setLicenseFront(dataToSave.licenseFront);
          if (dataToSave.licenseBack) setLicenseBack(dataToSave.licenseBack);
        }
        if (currentStep === "vehicle") {
          if (dataToSave.regBookImage) setRegBookImage(dataToSave.regBookImage);
          if (dataToSave.carFront) setCarFront(dataToSave.carFront);
          if (dataToSave.carBack) setCarBack(dataToSave.carBack);
          if (dataToSave.carAngle) setCarAngle(dataToSave.carAngle);
        }
        if (currentStep === "vehicleType") {
          if (dataToSave.vehicleType) setVehicleType(dataToSave.vehicleType);
        }
      }

      if (currentIndex < STEP_ORDER.length - 1) {
        setCurrentStep(STEP_ORDER[currentIndex + 1]);
      } else {
        await handleFinish();
      }
    } catch (error) {
      console.error("Onboarding Save Error:", error);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  // ---------- Step Validations ----------
  const isInformationStepValid =
    profileImage !== null && name.trim() !== "" && city.trim() !== "";

  const isIdentityStepValid =
    idNumber.trim() !== "" &&
    nationalIdImage !== null &&
    licenseFront !== null &&
    licenseBack !== null;

  const isVehicleStepValid =
    plateNumber.trim() !== "" &&
    year.trim() !== "" &&
    makeModel.trim() !== "" &&
    color.trim() !== "" &&
    regBookImage !== null &&
    carFront !== null &&
    carBack !== null &&
    carAngle !== null;

  const isVehicleTypeStepValid = vehicleType.length > 0;

  const isStepValid = (() => {
    switch (currentStep) {
      case "information":
        return isInformationStepValid;
      case "identity":
        return isIdentityStepValid;
      case "vehicle":
        return isVehicleStepValid;
      case "vehicleType":
        return isVehicleTypeStepValid; // Validation check
      case "submit":
        return agreedToTerms;
      default:
        return true;
    }
  })();

  // ---------- Step Components ----------
  const stepComponents = {
    welcome: <WelcomeTab />,
    information: (
      <InformationTab
        profileImage={profileImage}
        setProfileImage={setProfileImage}
        name={name}
        setName={setName}
        city={city}
        setCity={setCity}
        fullNameTrayRef={fullNameTrayRef}
        cityTrayRef={cityTrayRef}
      />
    ),
    identity: (
      <IdentityTab
        idNumber={idNumber}
        setIdNumber={setIdNumber}
        nationalIdImage={nationalIdImage}
        setNationalIdImage={setNationalIdImage}
        licenseFront={licenseFront}
        setLicenseFront={setLicenseFront}
        licenseBack={licenseBack}
        setLicenseBack={setLicenseBack}
        idNumberTrayRef={idNumberTrayRef}
      />
    ),
    vehicle: (
      <VehicleTab
        plateNumber={plateNumber}
        setPlateNumber={setPlateNumber}
        year={year}
        setYear={setYear}
        makeModel={makeModel}
        setMakeModel={setMakeModel}
        color={color}
        setColor={setColor}
        regBookImage={regBookImage}
        setRegBookImage={setRegBookImage}
        carFront={carFront}
        setCarFront={setCarFront}
        carBack={carBack}
        setCarBack={setCarBack}
        carAngle={carAngle}
        setCarAngle={setCarAngle}
        plateTrayRef={plateTrayRef}
        yearTrayRef={yearTrayRef}
        makeModelTrayRef={makeModelTrayRef}
        colorTrayRef={colorTrayRef}
      />
    ),
    vehicleType: (
      <VehicleTypeTab
        onTypeChange={setVehicleType}
        initialValue={vehicleType} // Pass this so it stays selected if they go back
      />
    ),
    submit: <SubmitTab agreed={agreedToTerms} onToggle={setAgreedToTerms} />,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* TOP SECTION */}
      <View style={styles.topSection}>
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + vs(10) }]}
          onPress={() => router.replace({ pathname: ROUTES.PASSENGER.HOME })}
        >
          <Ionicons
            name="close"
            size={ms(30)}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/images/drift_logo.png")}
              style={styles.driftLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.welcomeTitle}>{STEPS[currentStep].title}</Text>
            <Text style={styles.welcomeSubtitle}>
              {STEPS[currentStep].subtitle}
            </Text>
          </View>
        </View>
      </View>

      {/* BOTTOM SECTION */}
      <View style={styles.bottomSection}>
        <View style={styles.tabsIndicatorContainer}>
          {STEP_ORDER.map((step) => (
            <View
              key={step}
              style={[
                styles.stepDot,
                currentStep === step ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {stepComponents[currentStep]}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, vs(20)) },
          ]}
        >
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, vs(20)) },
            ]}
          >
            {/* Move Progress Bar OUTSIDE the footerRow */}
            {isSubmitting && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${uploadProgress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  Uploading: {uploadProgress}%
                </Text>
              </View>
            )}

            <View style={styles.footerRow}>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                >
                  <Ionicons
                    name="arrow-back"
                    size={ms(24)}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              )}
              <IRButton
                title={currentStep === "submit" ? "Finish" : "Next"}
                variant="primary"
                onPress={handleNext}
                disabled={!isStepValid || isSubmitting} // Disable while uploading
                loading={isSubmitting} // Show spinner inside button too
                fullWidth
                rightIcon={
                  !isSubmitting &&
                  currentStep !== "submit" && (
                    <Ionicons
                      name="arrow-forward"
                      size={ms(20)}
                      color={theme.colors.surface}
                    />
                  )
                }
                style={{
                  flex: 1,
                  opacity: !isStepValid ? 0.5 : 1,
                }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Floating InputTrays */}
      <InputTray
        ref={fullNameTrayRef}
        activeField="fullName"
        initialValue={name}
        onValueChange={setName}
      />

      <InputTray
        ref={cityTrayRef}
        activeField="city"
        initialValue={city}
        onValueChange={setCity}
      />

      <InputTray
        ref={idNumberTrayRef}
        activeField="idNumber"
        initialValue={idNumber}
        onValueChange={setIdNumber}
      />
      <InputTray
        ref={plateTrayRef}
        activeField="plateNumber"
        initialValue={plateNumber}
        onValueChange={setPlateNumber}
      />
      <InputTray
        ref={yearTrayRef}
        activeField="year"
        initialValue={year}
        onValueChange={setYear}
      />
      <InputTray
        ref={makeModelTrayRef}
        activeField="makeModel"
        initialValue={makeModel}
        onValueChange={setMakeModel}
      />
      <InputTray
        ref={colorTrayRef}
        activeField="color"
        initialValue={color}
        onValueChange={setColor}
      />
      <TripStatusModal
        visible={showStatusModal}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={handleModalClose}
      />
    </View>
  );
};

// ... Styles remain the same as your provided code
const styles = createStyles({
  container: { flex: 1, backgroundColor: theme.colors.primaryDark },
  topSection: {
    backgroundColor: theme.colors.background,
    height: hp(40),
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    right: s(20),
    zIndex: 10,
    padding: s(5),
    width: ms(40),
    height: ms(40),
    borderRadius: ms(22),
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadows.sm,
  },
  headerContent: { alignItems: "center", paddingHorizontal: s(30) },
  driftLogo: { width: ms(150), height: ms(150) },
  logoContainer: {
    height: ms(160),
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: { alignItems: "center", minHeight: vs(80) },
  welcomeTitle: {
    ...(theme.typography.h1 as TextStyle), // Explicit cast here
    color: theme.colors.text,
    textAlign: "center",
  },
  welcomeSubtitle: {
    ...(theme.typography.body as TextStyle), // Explicit cast here
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: vs(8),
  },
  bottomSection: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    marginTop: vs(-30),
    paddingVertical: vs(15),
    ...theme.shadows.lg,
  },
  tabsIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: s(8),
    paddingBottom: vs(10),
  },
  stepDot: { height: vs(4), borderRadius: theme.borderRadius.full },
  activeDot: { width: s(24), backgroundColor: theme.colors.primary },
  inactiveDot: { width: s(8), backgroundColor: theme.colors.border },
  scrollContent: {
    paddingHorizontal: s(24),
    paddingBottom: vs(100),
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: s(24),
    backgroundColor: theme.colors.surface,
  },
  footerRow: { flexDirection: "row", alignItems: "center", gap: s(12) },
  backButton: {
    width: vs(50),
    height: vs(50),
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    marginBottom: vs(15),
    width: "100%",
  },
  progressBarBackground: {
    height: vs(6),
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    ...(theme.typography.caption as TextStyle), // Explicit cast here
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: vs(4),
  },
});

export default DriverOnboarding;
