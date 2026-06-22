"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { generateInviteCode } from "@/lib/invite-code"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Globe, Lock, ArrowLeft, Sparkles, Shuffle, Eye, EyeOff, KeyRound } from "lucide-react"
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
  const [allowWildcards, setAllowWildcards] = useState(true)
  const [iconStyle, setIconStyle] = useState<LeagueIconStyle>("shapes")
  const [iconSeed, setIconSeed] = useState(randomLeagueSeed())
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [advancedOpts, setAdvancedOpts] = useState({
    firstScorer: true,
    goalMinute: false,
    yellowCards: false,
    redCards: true,
    corners: false,
    firstTeamToScore: true,
    halftimeResult: true,
    possession: false,
    totalShots: false,
    totalFouls: false,
    penalty: false,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setFormError(null)

    if (type === "private" && usePassword && password.length < 4) {
      setFormError("La contraseña debe tener al menos 4 caracteres")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const inviteCode = type === "private" ? generateInviteCode() : null
    const passwordToSend = type === "private" && usePassword && password ? password : null

    // Llamar a la RPC que crea la liga y hashea el password con bcrypt en el servidor
    const { data: rpcResult, error: rpcError } = await supabase.rpc("create_league", {
      p_name: data.name,
      p_description: data.description ?? null,
      p_type: type,
      p_invite_code: inviteCode,
      p_banner_color: bannerColor,
      p_config: {
        advancedOptions: { enabled: advancedEnabled, ...advancedOpts },
        multipliers: { exactScore: 5, correctWinner: 1, correctDraw: 3, winnerWithDiff: 4 },
        allowWildcards,
        allowBracketChallenge: true,
        icon: { style: iconStyle, seed: iconSeed },
      },
      p_password: passwordToSend,
    })

    if (rpcError || !rpcResult) {
      setFormError("No se pudo crear la liga. Intentá de nuevo.")
      console.error(rpcError)
      setLoading(false)
      return
    }

    const result = rpcResult as { ok: boolean; league_id?: string; error?: string }
    if (!result.ok || !result.league_id) {
      setFormError(`Error: ${result.error ?? "desconocido"}`)
      setLoading(false)
      return
    }

    // La RPC ya insertó al creador como miembro. Solo redirigir.
    router.push(`/ligas/${result.league_id}`)
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
              onClick={() => {
                setType("public")
                setUsePassword(false)
              }}
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

          {/* Contraseña — solo para ligas privadas */}
          {type === "private" && (
            <div className="mt-5 pt-5 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <KeyRound size={14} className="text-yellow-400" />
                  <span className="text-sm font-medium text-white">Proteger con contraseña</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUsePassword((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    usePassword ? "bg-green-500" : "bg-white/10"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                      usePassword ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <p className="text-gray-500 text-xs mb-3">
                Doble seguridad: además del código de invitación, vas a pedir esta contraseña para entrar
              </p>

              {usePassword && (
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    minLength={4}
                    maxLength={50}
                    autoComplete="new-password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}
            </div>
          )}
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

        {/* Comodines */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                <h3 className="text-white font-bold text-sm">Comodines</h3>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Todo o Nada, Escudo y Ladrón. Si los desactivás, en esta liga se
                juega solo con predicciones puras.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAllowWildcards((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                allowWildcards ? "bg-green-500" : "bg-white/10"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                  allowWildcards ? "left-5" : "left-0.5"
                }`}
              />
            </button>
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
                { key: "yellowCards", label: "Total tarjetas amarillas", mult: "x2" },
                { key: "redCards", label: "Tarjeta roja en el partido", mult: "x3" },
                { key: "corners", label: "Total córners", mult: "x2" },
                { key: "possession", label: "Equipo con más posesión", mult: "x2" },
                { key: "totalShots", label: "Total de tiros", mult: "x2" },
                { key: "totalFouls", label: "Total de faltas", mult: "x2" },
                { key: "penalty", label: "¿Hubo penal en el partido?", mult: "Sí+3/No+1" },
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

        {formError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {formError}
          </div>
        )}

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
