export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/chat/:path*",
    "/settings/:path*",
    "/api/chat/:path*",
    "/api/conversations/:path*",
  ],
};
