import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (!req.auth && pathname !== "/login" && pathname !== "/register") {
    const newUrl = new URL("/login", req.nextUrl.origin);
    newUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(newUrl);
  }
});

export const config = {
  matcher: ["/((?!_next|api/auth|api/register|favicon\\.ico).*)"],
};
