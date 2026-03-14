import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
      Exclude API routes and Next internals.
    */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};