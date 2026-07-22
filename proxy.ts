import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Auth } from "@/lib/constants";

// Gate the authenticated app. The session cookie is only checked for presence
// here; each route and Server Function re-verifies it with the Admin SDK.
export function proxy(request: NextRequest) {
  const session = request.cookies.get(Auth.SESSION_COOKIE)?.value;
  if (!session)
    return NextResponse.redirect(new URL("/sign-in", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/monitor/:path*"],
};
