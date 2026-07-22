import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Auth } from "@/lib/constants";
import { User } from "@/lib/types";

export async function getUser(id: string): Promise<User | null> {
  const snapshot = await adminDb.collection(User.COLLECTION).doc(id).get();
  const data = snapshot.data();
  if (!snapshot.exists || !data)
    return null;
  return { id: snapshot.id, ...data } as User;
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(Auth.SESSION_COOKIE)?.value;
  if (!sessionCookie)
    return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return await getUser(decoded.uid);
  } catch {
    return null;
  }
}
