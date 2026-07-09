import { FormEvent, useCallback, useEffect, useState } from "react";
import { updateProfile } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  getFirebaseAuth,
  isFirebaseConfigured,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "../firebase";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authError, setAuthError] = useState("");

  const firebaseConfigured = isFirebaseConfigured();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      const timer = window.setTimeout(() => setAuthReady(true), 0);
      return () => window.clearTimeout(timer);
    }

    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
  }, []);

  const handleAuth = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthError("");

      const auth = getFirebaseAuth();
      if (!auth) {
        setAuthError("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to .env.local");
        return;
      }

      const form = new FormData(event.currentTarget);
      const name = String(form.get("name") || "").trim();
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");

      if (!email || !password || (authMode === "signup" && !name)) {
        setAuthError("Complete the highlighted fields to continue.");
        return;
      }

      try {
        if (authMode === "signup") {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          if (name) {
            await updateProfile(credential.user, { displayName: name });
          }
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } catch (error) {
        const message = (error as Error).message;
        if (message.includes("CONFIGURATION_NOT_FOUND")) {
          setAuthError(
            "Enable Email/Password sign-in in Firebase Authentication, then restart the dev server.",
          );
        } else {
          setAuthError(message.replace("Firebase: ", ""));
        }
      }
    },
    [authMode],
  );

  const handleSignOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
    setFirebaseUser(null);
  }, []);

  const toggleAuthMode = useCallback(() => {
    setAuthMode((mode) => (mode === "signup" ? "signin" : "signup"));
    setAuthError("");
  }, []);

  const userEmail = firebaseUser?.email || "";
  const userName = firebaseUser?.displayName || userEmail.split("@")[0] || "Viewer";

  return {
    firebaseUser,
    firebaseConfigured,
    authReady,
    authMode,
    authError,
    signedIn: Boolean(firebaseUser),
    userEmail,
    userName,
    uid: firebaseUser?.uid || "",
    handleAuth,
    handleSignOut,
    toggleAuthMode,
  };
}
