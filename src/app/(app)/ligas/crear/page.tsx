"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { generateInviteCode } from "@/lib/invite-code"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Globe, Lock, ArrowLeft, Sparkles, Shuffle } from "lucide-react"
import Link from "next/link"
import LeagueIcon from "@/components/LeagueIcon"
import {
  LEAGUE_ICON_STYLES,
  randomLeagueSeed,
  type LeagueIconStyle,
} from "@/lib/league-icon"

const schema = z.object({
  name: z.string().min(3, "Mínimo 3 caracteres").max(40, "Máximo 40 caracteres"),
  description: z.string().max(200, "Máximo 200 caracteres").optional(),
})

type FormData = z.infer<typeof schema>

const BANNER_COLORS = [
  "#16a34a", // verde
  "#2563eb", // azul
  "#dc2626", // rojo
  "#7c3aed", // violeta
  "#ea580c", // naranja
  "#0891b2", // celeste
  "#f59e0b", // amarillo
  "#ec4899", // rosa
]

export default function CrearLigaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<"public" | "private">("private")
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0])
  const [advancedEnabled, setAdvancedEnabled] = useState(false)
  const [iconStyle, setIconStyle] = useState<LeagueIconStyle>("shapes")
  const [iconSeed, setIconSeed] = useState(randomLeagueSeed())
  const [advancedOpts, setAdvancedOpts] = useState({
    firstScorer: true,
    goalMinute: false,
    yellowCards: false,
    redCards: true,
    corners: false,
    firstTeamToScore: true,
    halftimeResult: true,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const inviteCode = type === "private" ? generateInviteCode() : null

    const { data: league, error } = await supabase
      .from("leagues")
      .insert({
        name: data.name,
        description: data.description ?? null,
        type,
        invite_code: inviteCode,
        banner_color: bannerColor,
        created_by: user.id,
        config: {
          advancedOptions: { enabled: advancedEnabled, ...advancedOpts },
          multipliers: { exactScore: 5, correctWinner: 1, correctDraw: 4, winnerWithDiff: 3 },
          allowWildcards: true,
          allowBracketChallenge: true,
          icon: { style: iconStyle, seed: iconSeed },
        },
      })
      .select()
      .single()

    if (error || !league) {
      console.error(error)
      setLoading(false)
      return
    }

    // El creador se une automáticamente a su propia liga
    const leagueData = league as { id: string }
    await supabase.from("league_members").insert({
      league_id: leagueData.id,
      user_id: user.id,
    })

    router.push(`/ligas/${leagueData.id}`)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <Link
        href="/ligas"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver
      </Link>

      <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Crear liga</h1>
      <p className="text-gray-500 mb-8">Armá tu liga y compartila con quien quieras</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Nombre y descripción */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nombre de la liga
            </label>
            <input
              {...register("name")}
              placeholder="Ej: Los Pibes del Trabajo"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Descripción <span className="text-gray-600">(opcional)</span>
            </label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="¿De qué se trata tu liga?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors resize-none"
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>
        </div>

        {/* Tipo */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Tipo de liga</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType("private")}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                type === "private"
                  ? "border-green-500 bg-green-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <Lock size={18} className={type === "private" ? "text-green-400" : "text-gray-500"} />
              <p className="text-white font-bold mt-2 text-sm">Privada</p>
              <p className="text-gray-500 text-xs mt-1">Solo con código</p>
            </button>
            <button
              type="button"
              onClick={() => setType("public")}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                type === "public"
                  ? "border-green-500 bg-green-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <Globe size={18} className={type === "public" ? "text-green-400" : "text-gray-500"} />
              <p className="text-white font-bold mt-2 text-sm">Pública</p>
              <p className="text-gray-500 text-xs mt-1">Cualquiera se une</p>
            </button>
          </div>
        </div>

        {/* Color */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Color de la liga</h3>
          <div className="flex flex-wrap gap-2">
            {BANNER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBannerColor(c)}
                className="w-10 h-10 rounded-xl border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: bannerColor === c ? "white" : "transparent",
                  transform: bannerColor === c ? "scale(1.1)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Escudo */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Escudo de la liga</h3>
            <button
              type="button"
              onClick={() => setIconSeed(randomLeagueSeed())}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Shuffle size={12} />
              Mezclar
            </button>
          </div>

          {/* Preview grande */}
          <div className="flex justify-center mb-5">
            <LeagueIcon
              config={{ style: iconStyle, seed: iconSeed }}
              bannerColor={bannerColor}
              size={100}
              className="border-4 border-white/10"
            />
          </div>

          {/* Estilo */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {LEAGUE_ICON_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setIconStyle(s.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                  iconStyle === s.value
                    ? "border-green-500/60 bg-green-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <LeagueIcon
                  config={{ style: s.value, seed: iconSeed }}
                  bannerColor={bannerColor}
                  size={36}
                />
                <span
                  className={`text-[10px] font-medium ${
                    iconStyle === s.value ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Opciones avanzadas */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-400" />
                <h3 className="text-white font-bold text-sm">Opciones avanzadas</h3>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Predicciones extra que dan más puntos (apostando puntos)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAdvancedEnabled((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                advancedEnabled ? "bg-green-500" : "bg-white/10"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                  advancedEnabled ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {advancedEnabled && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              {[
                { key: "firstScorer", label: "Goleador del partido", mult: "x5" },
                { key: "firstTeamToScore", label: "Primer equipo en marcar", mult: "x3" },
                { key: "halftimeResult", label: "Resultado al descanso", mult: "x3" },
                { key: "goalMinute", label: "Minuto del primer gol", mult: "x4" },
                { key: "yellowCards", label: "Tarjetas amarillas", mult: "x2" },
                { key: "redCards", label: "Tarjeta roja en el partido", mult: "x3" },
                { key: "corners", label: "Cantidad de córners", mult: "x2" },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={advancedOpts[opt.key as keyof typeof advancedOpts]}
                      onChange={(e) =>
                        setAdvancedOpts((a) => ({ ...a, [opt.key]: e.target.checked }))
                      }
                      className="w-4 h-4 accent-green-500"
                    />
                    <span className="text-sm text-gray-300">{opt.label}</span>
                  </div>
                  <span className="text-xs text-green-400 font-bold">{opt.mult}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-black py-4 rounded-xl transition-colors"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? "Creando..." : "Crear liga"}
        </button>
      </form>
    </main>
  )
}
