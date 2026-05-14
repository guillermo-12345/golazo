"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-center">
        <Loader2 size={18} className="text-gray-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => setTheme("dark")}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
          theme === "dark"
            ? "border-green-500/60 bg-green-500/10 text-white"
            : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
        }`}
      >
        <Moon size={16} />
        <span className="text-sm font-medium">Oscuro</span>
      </button>
      <button
        onClick={() => setTheme("light")}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
          theme === "light"
            ? "border-green-500/60 bg-green-500/10 text-white"
            : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
        }`}
      >
        <Sun size={16} />
        <span className="text-sm font-medium">Claro</span>
      </button>
    </div>
  )
}
