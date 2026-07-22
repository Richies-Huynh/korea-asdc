"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

async function syncSession(): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!response.ok)
    throw new Error("Failed to establish a session");
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
  await syncSession();
}

export async function signUp(email: string, password: string, displayName: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName)
    await updateProfile(credential.user, { displayName });
  await syncSession();
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
  await fetch("/api/auth/session", { method: "DELETE" });
}
