import Link from "next/link"
import { Trophy, Users, Zap, Target, ChevronRight, Star } from "lucide-react"

const FEATURES = [
  {
    icon: Target,
    title: "Predecí cada partido",
    desc: "Apostá al resultado exacto, al ganador o activá las opciones avanzadas para multiplicar tus puntos.",
  },
  {
    icon: Users,
    title: "Ligas con tus amigos",
    desc: "Creá una liga privada, invitá a quien quieras y competí en tu propia tabla de posiciones.",
  },
  {
    icon: Trophy,
    title: "Bracket Challenge",
    desc: "Predecí el cuadro completo antes de que empiece el torneo. Cada avance correcto suma puntos.",
  },
  {
    icon: Zap,
    title: "Comodines estratégicos",
    desc: "Usá el Todo o Nada, el Escudo o el Ladrón en el momento justo para cambiar la partida.",
  },
]

const STATS = [
  { label: "Partidos a predecir", value: "104" },
  { label: "Equipos participantes", value: "48" },
  { label: "Días de torneo", value: "39" },
  { label: "Es gratis", value: "100%" },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md border-b border-white/10 bg-black/40">
        <span className="text-2xl font-black text-white tracking-tight">
          GOL<span className="text-green-500">AZO</span>
        </span>
        <Link
          href="/login"
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-full text-sm transition-colors"
        >
          Entrar <ChevronRight size={14} />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Star size={14} className="fill-green-400" />
            Mundial USA · Canadá · México 2026
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-6">
            La quiniela<br />
            <span className="text-green-500">más épica</span><br />
            del Mundial
          </h1>

          <p className="text-lg text-gray-400 max-w-xl mx-auto mb-10">
            Predecí resultados, competí en ligas privadas con tus amigos, usá comodines y demostrá que sabés más de fútbol que nadie.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black text-lg px-8 py-4 rounded-full transition-all hover:scale-105"
            >
              Jugá gratis <ChevronRight size={20} />
            </Link>
            <Link href="#features" className="text-gray-400 hover:text-white font-medium transition-colors">
              Cómo funciona ↓
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <p className="text-4xl font-black text-green-400">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-white text-center mb-4">
            Todo lo que necesitás para<br />
            <span className="text-green-500">dominar la quiniela</span>
          </h2>
          <p className="text-gray-500 text-center mb-12">Sin apuestas de dinero. Solo puro fútbol.</p>

          <div className="grid md:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white/5 border border-white/10 hover:border-green-500/30 rounded-2xl p-6 transition-colors group"
              >
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                  <f.icon size={20} className="text-green-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-24 mt-auto">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-b from-green-950/50 to-transparent border border-green-500/20 rounded-3xl p-12">
            <h2 className="text-4xl font-black text-white mb-4">
              ¿Listo para el<br />
              <span className="text-green-500">Mundial?</span>
            </h2>
            <p className="text-gray-400 mb-8">Creá tu cuenta gratis, armá tu liga y empezá a predecir.</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black text-lg px-10 py-4 rounded-full transition-all hover:scale-105"
            >
              Empezar ahora <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-6 text-center">
        <p className="text-gray-600 text-sm">
          Desarrollado con ❤ por <span className="text-gray-300 font-semibold">Guillermo Ibañez</span> · © 2026 Golazo
        </p>
      </footer>
    </main>
  )
}
