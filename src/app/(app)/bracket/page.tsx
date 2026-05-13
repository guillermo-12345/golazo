import { GitBranch, Trophy, Lock } from "lucide-react"

export default function BracketPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white">Bracket Challenge</h1>
        <p className="text-gray-500 mt-1 text-sm">Predecí el cuadro completo del Mundial</p>
      </header>

      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-3xl p-8 text-center">
        <div className="w-16 h-16 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <GitBranch size={28} className="text-yellow-400" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Próximamente</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Cuando se sortee el cuadro del Mundial (diciembre 2025), vas a poder predecir todo el
          recorrido: quién avanza de cada grupo, semifinales, final y campeón.
        </p>

        <div className="grid grid-cols-3 gap-3 mt-8 max-w-md mx-auto">
          <BracketStat label="Puntos por grupo" value="2" />
          <BracketStat label="Por semifinal" value="10" />
          <BracketStat label="Por campeón" value="50" />
        </div>

        <div className="inline-flex items-center gap-2 mt-8 bg-white/5 border border-white/10 rounded-full px-4 py-2">
          <Lock size={14} className="text-gray-500" />
          <span className="text-gray-400 text-sm">Disponible tras el sorteo</span>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-yellow-400" />
          <h3 className="text-white font-bold">¿Cómo funciona?</h3>
        </div>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>· Antes de que arranque el Mundial, completás todo el bracket</li>
          <li>· Cada predicción acertada (qué selección avanza) suma puntos</li>
          <li>· Los puntos del bracket se acumulan en cada liga donde estés</li>
          <li>· Los aciertos en rondas finales valen mucho más que los de grupos</li>
        </ul>
      </div>
    </main>
  )
}

function BracketStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
      <p className="text-2xl font-black text-yellow-400">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
