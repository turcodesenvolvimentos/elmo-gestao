import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessRoute } from "@/lib/auth/permissions";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session;

  const publicRoutes = ["/login"];

  if (isLoggedIn && pathname === "/login") {
    const homeUrl = new URL("/home", req.url);
    return NextResponse.redirect(homeUrl);
  }

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar permissões para rotas protegidas
  if (!canAccessRoute(session, pathname)) {
    const forbiddenUrl = new URL("/home", req.url);
    forbiddenUrl.searchParams.set("error", "sem-permissao");
    return NextResponse.redirect(forbiddenUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
