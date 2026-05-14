import { Heart } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-16 px-4 md:px-8 py-6">
      <div className="max-w-5xl mx-auto text-center text-xs text-gray-600 flex items-center justify-center gap-1.5 flex-wrap">
        <span>Desarrollado con</span>
        <Heart size={11} className="text-red-400 fill-red-400" />
        <span>por</span>
        <span className="text-gray-300 font-semibold">Guillermo Ibañez</span>
        <span className="mx-1">·</span>
        <span>© 2026 Golazo</span>
      </div>
    </footer>
  )
}
