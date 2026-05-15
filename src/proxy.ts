import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Proxy de Next.js (antes 'middleware').
 * Su único trabajo crítico es refrescar el access token de Supabase en cada
 * navegación. Sin esto, el access token expira en 1h y el usuario tiene que
 * volver a loguearse aunque el refresh token siga vivo.
 *
 * Está envuelto en try/catch — si Supabase falla por cualquier motivo, la
 * página igual se sirve normalmente (preferimos pasar antes que devolver 500).
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

    // getUser() refresca el access token via refresh token si esta vencido.
    // Las cookies actualizadas se pasan al supabaseResponse via setAll.
    await supabase.auth.getUser()
  } catch (err) {
    console.error("Proxy auth refresh failed:", err)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match todo excepto: archivos estaticos, imagenes optimizadas, favicon, /api
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|xml|txt)$).*)",
  ],
}
