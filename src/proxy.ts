import { NextResponse, type NextRequest } from "next/server"

// Proxy minimal — diagnostico de 404 en Vercel.
// La proteccion de auth queda en los layouts del lado servidor (src/app/(app)/layout.tsx).
// TODO: re-habilitar logica de redirect a /login cuando confirmemos que la app sirve correctamente.
export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  // Matcher que no machea nada — proxy efectivamente desactivado.
  matcher: ["/__never_match__/:path*"],
}
