// app/services/sessionRestore.ts

let hasRestored = false;
let isRestoring = false;

export async function restoreSessionOnce(restoreFn: () => Promise<void>) {
  if (hasRestored) {
    console.log("⏭️ Session already restored");
    return;
  }

  if (isRestoring) {
    console.log("⏳ Session restore in progress");
    return;
  }

  try {
    isRestoring = true;

    console.log("🔄 Restoring session...");

    await restoreFn();

    hasRestored = true;

    console.log("✅ Session restored");
  } catch (err) {
    console.error("❌ Restore failed:", err);
  } finally {
    isRestoring = false;
  }
}

export function resetSessionRestore() {
  hasRestored = false;
  isRestoring = false;
}
