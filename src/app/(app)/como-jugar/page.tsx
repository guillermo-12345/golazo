import { BookOpen, Target, Sparkles, GitBranch, Trophy, Users, Award, AlertTriangle } from "lucide-react"
import { getLocale } from "@/lib/get-locale"

export default async function ComoJugarPage() {
  const locale = await getLocale()
  const isAR = locale === "es-AR"

  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={28} className="text-green-400" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Cómo jugar</h1>
        </div>
        <p className="text-gray-500 text-sm">
          {isAR
            ? "Todo lo que necesitás saber para empezar a sumar puntos"
            : "Todo lo que necesitas saber para empezar a sumar puntos"}
        </p>
      </header>

      {/* Resumen rápido */}
      <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl p-5 mb-8">
        <h2 className="text-white font-bold mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-green-400" />
          En 30 segundos
        </h2>
        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
          <li>
            {isAR ? "Te unís a una liga o creás la tuya." : "Te unes a una liga o creas la tuya."}
          </li>
          <li>
            {isAR
              ? "Antes de cada partido, predecís el resultado (ej: Argentina 2 - Brasil 1)."
              : "Antes de cada partido, predices el resultado (ej: Argentina 2 - Brasil 1)."}
          </li>
          <li>
            {isAR
              ? "Cuando termina el partido, el sistema te suma puntos automáticamente."
              : "Cuando termina el partido, el sistema te suma puntos automáticamente."}
          </li>
          <li>
            {isAR
              ? "Quien más puntos acumule al final del Mundial, gana la liga."
              : "Quien más puntos acumule al final del Mundial, gana la liga."}
          </li>
        </ol>
      </div>

      {/* Puntuación básica */}
      <Section icon={Target} title="Puntuación básica" color="text-green-400">
        <p className="text-gray-400 text-sm mb-4">
          {isAR
            ? "Para cada partido recibís puntos según qué tan cerca esté tu predicción del resultado real:"
            : "Para cada partido recibes puntos según qué tan cerca esté tu predicción del resultado real:"}
        </p>
        <div className="space-y-3">
          <PointRule
            points={5}
            title={isAR ? "Resultado exacto" : "Resultado exacto"}
            desc={
              isAR
                ? "Predijiste 2-1 y terminó 2-1. ¡El mejor caso!"
                : "Predijiste 2-1 y terminó 2-1. ¡El mejor caso!"
            }
            color="bg-green-500/15 border-green-500/40 text-green-300"
          />
          <PointRule
            points={4}
            title={isAR ? "Ganador con misma diferencia" : "Ganador con misma diferencia"}
            desc={
              isAR
                ? "Acertaste el ganador y la diferencia exacta (ej: 2-1 cuando termina 3-2)."
                : "Acertaste el ganador y la diferencia exacta (ej: 2-1 cuando termina 3-2)."
            }
            color="bg-yellow-500/15 border-yellow-500/40 text-yellow-300"
          />
          <PointRule
            points={3}
            title={isAR ? "Empate correcto" : "Empate correcto"}
            desc={
              isAR
                ? "Predijiste empate y terminó empate, sin el resultado exacto (ej: 1-1 vs el real 2-2)."
                : "Predijiste empate y terminó empate, sin el resultado exacto (ej: 1-1 vs el real 2-2)."
            }
            color="bg-blue-500/15 border-blue-500/40 text-blue-300"
          />
          <PointRule
            points={1}
            title={isAR ? "Solo ganador" : "Solo ganador"}
            desc={
              isAR
                ? "Acertaste quién gana, pero no el resultado (ej: predijiste 1-0 y terminó 3-1)."
                : "Acertaste quién gana, pero no el resultado (ej: predijiste 1-0 y terminó 3-1)."
            }
            color="bg-gray-500/15 border-gray-500/40 text-gray-300"
          />
          <PointRule
            points={0}
            title={isAR ? "Fallaste" : "Fallaste"}
            desc={isAR ? "No acertaste ni el ganador. ¡A intentarlo de nuevo!" : "No acertaste ni el ganador. ¡A intentarlo de nuevo!"}
            color="bg-red-500/10 border-red-500/30 text-red-300"
          />
        </div>
      </Section>

      {/* Comodines */}
      <Section icon={Sparkles} title="Comodines (2 por liga)" color="text-yellow-400">
        <p className="text-gray-400 text-sm mb-4">
          {isAR
            ? "Cada usuario tiene 2 comodines por liga. Los usás cuando querés en cualquier partido, pero solo uno por partido."
            : "Cada usuario tiene 2 comodines por liga. Los usas cuando quieras en cualquier partido, pero solo uno por partido."}
        </p>
        <div className="space-y-3">
          <Wildcard
            name="Todo o Nada"
            color="text-red-400"
            bg="bg-red-500/10 border-red-500/30"
            desc={
              isAR
                ? "Si acertás, los puntos del partido se multiplican x2. Si fallás, perdés 2 puntos. Apuesta arriesgada."
                : "Si aciertas, los puntos del partido se multiplican x2. Si fallas, pierdes 2 puntos. Apuesta arriesgada."
            }
          />
          <Wildcard
            name="Escudo"
            color="text-blue-400"
            bg="bg-blue-500/10 border-blue-500/30"
            desc={
              isAR
                ? "Si sos el líder de la liga, te blinda: ningún Ladrón puede robarte puntos en ese partido."
                : "Si eres el líder de la liga, te blinda: ningún Ladrón puede robarte puntos en ese partido."
            }
          />
          <Wildcard
            name="Ladrón"
            color="text-purple-400"
            bg="bg-purple-500/10 border-purple-500/30"
            desc={
              isAR
                ? "Si acertás el partido, le robás 2 puntos al líder de la liga (salvo que use Escudo)."
                : "Si aciertas el partido, le robas 2 puntos al líder de la liga (salvo que use Escudo)."
            }
          />
        </div>
      </Section>

      {/* Opciones avanzadas */}
      <Section icon={AlertTriangle} title="Opciones avanzadas (configurable por liga)" color="text-orange-400">
        <p className="text-gray-400 text-sm mb-4">
          {isAR
            ? "El creador de cada liga puede activar predicciones extra que multiplican los puntos. Para usarlas, apostás algunos de tus puntos: si acertás los recuperás multiplicados, si fallás los perdés."
            : "El creador de cada liga puede activar predicciones extra que multiplican los puntos. Para usarlas, apuestas algunos de tus puntos: si aciertas los recuperas multiplicados, si fallas los pierdes."}
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Puntos por apuesta (cuanto más difícil, más paga)
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <AdvancedRow label="Primer goleador del partido" mult="+6" />
            <AdvancedRow label="Minuto del primer gol" mult="+5" />
            <AdvancedRow label="Resultado al descanso" mult="+4" />
            <AdvancedRow label="Tarjeta roja: sí" mult="+4" />
            <AdvancedRow label="Tarjetas amarillas" mult="+3" />
            <AdvancedRow label="Cantidad de córners" mult="+3" />
            <AdvancedRow label="Total de tiros" mult="+3" />
            <AdvancedRow label="Total de faltas" mult="+3" />
            <AdvancedRow label="Primer equipo en marcar" mult="+2" />
            <AdvancedRow label="Más posesión" mult="+1" />
            <AdvancedRow label="Tarjeta roja: no" mult="+1" />
          </div>
        </div>
      </Section>

      {/* Bracket Challenge */}
      <Section icon={GitBranch} title="Bracket Challenge" color="text-yellow-400">
        <p className="text-gray-400 text-sm mb-4">
          {isAR
            ? "Antes del 10 de junio, podés predecir el podio del Mundial. Suma puntos independiente de tus predicciones partido a partido."
            : "Antes del 10 de junio, puedes predecir el podio del Mundial. Suma puntos independiente de tus predicciones partido a partido."}
        </p>
        <div className="space-y-2 text-sm">
          <BracketRow label="🥇 Campeón correcto" pts={50} />
          <BracketRow label="🥈 Subcampeón correcto" pts={25} />
          <BracketRow label="⚽ Goleador del torneo" pts={25} />
          <BracketRow label="🥉 Tercer puesto correcto" pts={15} />
          <BracketRow label="4️⃣ Cuarto puesto correcto" pts={10} />
        </div>
        <p className="text-xs text-yellow-400 mt-3 font-bold">Máximo: 125 puntos extra</p>
      </Section>

      {/* Ligas */}
      <Section icon={Users} title="Ligas" color="text-blue-400">
        <div className="space-y-3 text-sm text-gray-400">
          <div>
            <p className="text-white font-bold mb-1">🌐 Liga Global</p>
            <p>
              {isAR
                ? "Todos los usuarios están automáticamente. Compitas contra el mundo entero."
                : "Todos los usuarios están automáticamente. Compites contra el mundo entero."}
            </p>
          </div>
          <div>
            <p className="text-white font-bold mb-1">👥 Ligas públicas</p>
            <p>
              {isAR
                ? "Cualquiera puede unirse desde el buscador. Perfecto para abrir una liga temática."
                : "Cualquiera puede unirse desde el buscador. Perfecto para abrir una liga temática."}
            </p>
          </div>
          <div>
            <p className="text-white font-bold mb-1">🔒 Ligas privadas</p>
            <p>
              {isAR
                ? "Solo se entra con el código de invitación (y contraseña si la activaste). Ideal para amigos o trabajo."
                : "Solo se entra con el código de invitación (y contraseña si la activaste). Ideal para amigos o trabajo."}
            </p>
          </div>
        </div>
      </Section>

      {/* Badges */}
      <Section icon={Award} title="Logros" color="text-purple-400">
        <p className="text-gray-400 text-sm">
          {isAR
            ? "Hay 14 logros desbloqueables: desde el básico 'Bienvenido' hasta el legendario 'Vidente' (predecir al campeón). Los podés ver todos en tu perfil."
            : "Hay 14 logros desbloqueables: desde el básico 'Bienvenido' hasta el legendario 'Vidente' (predecir al campeón). Los puedes ver todos en tu perfil."}
        </p>
      </Section>

      {/* Reglas importantes */}
      <Section icon={AlertTriangle} title="Reglas importantes" color="text-red-400">
        <ul className="space-y-2 text-sm text-gray-300 list-disc list-inside">
          <li>
            {isAR
              ? "Las predicciones se cierran cuando arranca el partido. Después no podés editar."
              : "Las predicciones se cierran cuando arranca el partido. Después no puedes editar."}
          </li>
          <li>
            {isAR
              ? "Podés predecir el mismo partido en distintas ligas con resultados diferentes."
              : "Puedes predecir el mismo partido en distintas ligas con resultados diferentes."}
          </li>
          <li>
            {isAR
              ? "El Bracket Challenge se cierra el 10 de junio antes del inicio del Mundial."
              : "El Bracket Challenge se cierra el 10 de junio antes del inicio del Mundial."}
          </li>
          <li>
            {isAR
              ? "Esto es solo por diversión. No hay apuestas reales de dinero involucradas."
              : "Esto es solo por diversión. No hay apuestas reales de dinero involucradas."}
          </li>
        </ul>
      </Section>

      {/* Tips */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-5 mt-8">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" />
          {isAR ? "Tips para ganar" : "Tips para ganar"}
        </h3>
        <ul className="space-y-2 text-sm text-gray-400 list-disc list-inside">
          <li>
            {isAR
              ? "Acordate de predecir antes del partido — predicción olvidada = 0 puntos."
              : "Recuerda predecir antes del partido — predicción olvidada = 0 puntos."}
          </li>
          <li>
            {isAR
              ? "Usá los comodines en partidos importantes (mata-mata, semifinales)."
              : "Usa los comodines en partidos importantes (mata-mata, semifinales)."}
          </li>
          <li>
            {isAR
              ? "El resultado exacto vale 5 veces más que solo el ganador. Pensalo bien."
              : "El resultado exacto vale 5 veces más que solo el ganador. Piénsalo bien."}
          </li>
          <li>
            {isAR
              ? "Completá el Bracket Challenge: son 125 puntos extra si acertás."
              : "Completa el Bracket Challenge: son 125 puntos extra si aciertas."}
          </li>
        </ul>
      </div>
    </main>
  )
}

function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: typeof BookOpen
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8">
      <h2 className="flex items-center gap-2 text-white font-bold text-lg mb-4">
        <Icon size={20} className={color} />
        {title}
      </h2>
      {children}
    </section>
  )
}

function PointRule({
  points,
  title,
  desc,
  color,
}: {
  points: number
  title: string
  desc: string
  color: string
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${color}`}>
      <div className="font-black text-2xl w-12 text-center tabular-nums">+{points}</div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm">{title}</p>
        <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function Wildcard({ name, color, bg, desc }: { name: string; color: string; bg: string; desc: string }) {
  return (
    <div className={`p-3 rounded-xl border ${bg}`}>
      <p className={`font-bold text-sm ${color} mb-1`}>{name}</p>
      <p className="text-gray-400 text-xs">{desc}</p>
    </div>
  )
}

function AdvancedRow({ label, mult }: { label: string; mult: string }) {
  return (
    <div className="flex items-center justify-between p-2 bg-black/30 rounded-lg">
      <span className="text-gray-300 text-xs">{label}</span>
      <span className="text-orange-400 font-bold text-sm">{mult}</span>
    </div>
  )
}

function BracketRow({ label, pts }: { label: string; pts: number }) {
  return (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
      <span className="text-gray-300">{label}</span>
      <span className="text-yellow-400 font-black tabular-nums">+{pts}</span>
    </div>
  )
}
