// utils/routes.ts
export const ROUTES = {
  PASSENGER: {
    HOME: "/passenger" as const, // ✅ REMOVE /index
  },
  DRIVER: {
    HOME: "/driver" as const, // ✅ REMOVE /index
  },
  ONBOARDING: {
    GET_STARTED: "/onboarding/get-started" as const,
    WELCOME: "/onboarding/welcome" as const,
    VERIFY: "/onboarding/verify" as const,
    USER_TYPE: "/onboarding/user-type-selection" as const,
    PROFILE_IMAGE: "/onboarding/update-profile-image" as const,
  },
};