import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const publicRoutes = ["/", "/login", "/cadastro", "/cadastro-cliente", "/assinatura", "/recuperar-senha", "/nova-senha"];
  const isPublic =
    publicRoutes.some((r) => pathname === r) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/auth/");

  if (!user && !isPublic) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const role = (user.app_metadata?.role as string | undefined) ?? 'client';
    const home  = role === 'owner' ? '/painel/dashboard' : '/app';

    // Redireciona usuário logado que acessa páginas de auth
    const authPages = ['/login', '/cadastro', '/cadastro-cliente'];
    if (authPages.includes(pathname)) {
      return NextResponse.redirect(new URL(home, request.url));
    }

    // Gating: cliente tentando acessar área da proprietária
    if (pathname.startsWith('/painel') && role === 'client') {
      return NextResponse.redirect(new URL('/app', request.url));
    }

    // Gating: proprietária tentando acessar área da cliente
    if (pathname.startsWith('/app') && role === 'owner') {
      return NextResponse.redirect(new URL('/painel/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
