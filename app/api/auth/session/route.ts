import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Auth } from "@/lib/constants";
import { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const decoded = await adminAuth.verifyIdToken(token);
  const sessionCookie = await adminAuth.createSessionCookie(token, {
    expiresIn: Auth.SESSION_MAX_AGE_SECONDS * 1000,
  });

  // Create the user profile document on first sign in.
  const userRef = adminDb.collection(User.COLLECTION).doc(decoded.uid);
  const existing = await userRef.get();
  const existingData = existing.data();
  if (!existing.exists || !existingData) {
    const user: Omit<User, "id"> = {
      email: decoded.email ?? "",
      display_name: decoded.name ?? decoded.email?.split("@")[0] ?? "User",
      role: User.ROLE_USER,
      created_at: Date.now(),
    };
    await userRef.set(user);
  }

  const cookieStore = await cookies();
  cookieStore.set(Auth.SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Auth.SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(Auth.SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
