import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/ligas",
  "/perfil",
  "/bracket",
  "/partidos",
  "/notificaciones",
  "/onboarding",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas que nunca necesitan auth (landing, callbacks, APIs)
  // Asi evitamos que el proxy crashee y devuelva 404 en ellas
  if (
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  // Si por algun motivo no estan las env vars, dejamos pasar
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

    if (isProtected && !user) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    if (pathname === "/login" && user) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  } catch (err) {
    console.error("Proxy auth check failed:", err)
    // Si falla la auth, mejor dejar pasar que devolver 500/404
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
