import { redirect } from "next/navigation"

// La pagina de equipo se unifico en /paises/[code].
// Mantenemos esta ruta como redirect para que los links viejos sigan andando.
export default async function EquipoRedirect({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  redirect(`/paises/${code.toUpperCase()}`)
}
