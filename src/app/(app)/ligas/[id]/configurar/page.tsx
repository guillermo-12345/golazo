"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Loader2,
  ArrowLeft,
  Sparkles,
  Shuffle,
  Eye,
  EyeOff,
  KeyRound,
  AlertTriangle,
  Trash2,
  Save,
} from "lucide-react"
import Link from "next/link"
import LeagueIcon from "@/components/LeagueIcon"
import {
  LEAGUE_ICON_STYLES,
  randomLeagueSeed,
  type LeagueIconStyle,
} from "@/lib/league-icon"

const BANNER_COLORS = [
  "#16a34a",
  "#2563eb",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#f59e0b",
  "#ec4899",
]

type LeagueConfig = {
  advancedOptions?: { enabled?: boolean; firstScorer?: boolean; goalMinute?: boolean; yellowCards?: boolean; redCards?: boolean; corners?: boolean; firstTeamToScore?: boolean; halftimeResult?: boolean }
  multipliers?: { exactScore: number; correctWinner: number; correctDraw: number; winnerWithDiff: number }
  allowWildcards?: boolean
  allowBracketChallenge?: boolean
  icon?: { style: LeagueIconStyle; seed: string }
}

export default function ConfigurarLigaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: leagueId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Datos editables
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0])
  const [iconStyle, setIconStyle] = useState<LeagueIconStyle>("shapes")
  const [iconSeed, setIconSeed] = useState(randomLeagueSeed())
  const [advancedEnabled, setAdvancedEnabled] = useState(false)
  const [allowWildcards, setAllowWildcards] = useState(true)
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
  })

  // Password
  const [currentHasPassword, setCurrentHasPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [removePassword, setRemovePassword] = useState(false)

  // Eliminar
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState("")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: league } = await supabase
        .from("leagues")
        .select("name, description, banner_color, config, created_by, password_hash, type")
        .eq("id", leagueId)
        .single()

      if (!league) {
        router.push("/ligas")
        return
      }

      const l = league as {
        name: string
        description: string | null
        banner_color: string
        config: LeagueConfig | null
        created_by: string | null
        password_hash: string | null
        type: string
      }

      if (l.created_by !== user.id) {
        setError("Solo el creador puede configurar la liga")
        setLoading(false)
        return
      }

      if (l.type === "global") {
        setError("La liga global no se puede editar")
        setLoading(false)
        return
      }

      setName(l.name)
      setDescription(l.description ?? "")
      setBannerColor(l.banner_color)
      setCurrentHasPassword(l.password_hash !== null)

      if (l.config?.icon) {
        setIconStyle(l.config.icon.style)
        setIconSeed(l.config.icon.seed)
      }
      const adv = l.config?.advancedOptions as Record<string, boolean> | undefined
      if (adv) {
        setAdvancedEnabled(adv.enabled ?? false)
        setAdvancedOpts({
          firstScorer: adv.firstScorer ?? false,
          goalMinute: adv.goalMinute ?? false,
          yellowCards: adv.yellowCards ?? false,
          redCards: adv.redCards ?? false,
          corners: adv.corners ?? false,
          firstTeamToScore: adv.firstTeamToScore ?? false,
          halftimeResult: adv.halftimeResult ?? false,
          possession: adv.possession ?? false,
          totalShots: adv.totalShots ?? false,
          totalFouls: adv.totalFouls ?? false,
        })
      }
      setAllowWildcards(
        (l.config as { allowWildcards?: boolean } | null)?.allowWildcards !== false
      )
      setLoading(false)
    }
    load()
  }, [leagueId, router])

  async function handleSave() {
    setError(null)
    if (name.length < 3) {
      setError("El nombre debe tener al menos 3 caracteres")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const config = {
      advancedOptions: { enabled: advancedEnabled, ...advancedOpts },
      multipliers: { exactScore: 5, correctWinner: 1, correctDraw: 3, winnerWithDiff: 4 },
      allowWildcards,
      allowBracketChallenge: true,
      icon: { style: iconStyle, seed: iconSeed },
    }

    const { data, error: rpcError } = await supabase.rpc("update_league", {
      p_league_id: leagueId,
      p_name: name,
      p_description: description || null,
      p_banner_color: bannerColor,
      p_config: config,
    })

    if (rpcError) {
      setError("Error al guardar: " + rpcError.message)
      setSaving(false)
      return
    }

    const result = data as { ok: boolean; error?: string }
    if (!result.ok) {
      setError(`Error: ${result.error ?? "desconocido"}`)
      setSaving(false)
      return
    }

    // Manejar password aparte
    if (newPassword && newPassword.length >= 4) {
      await supabase.rpc("set_league_password", {
        p_league_id: leagueId,
        p_password: newPassword,
      })
      setCurrentHasPassword(true)
      setNewPassword("")
    } else if (removePassword && currentHasPassword) {
      await supabase.rpc("set_league_password", {
        p_league_id: leagueId,
        p_password: null,
      })
      setCurrentHasPassword(false)
      setRemovePassword(false)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setSaving(false)
  }

  async function handleDelete() {
    if (deleteText !== "ELIMINAR") return
    setDeleting(true)
    const supabase = createClient()
    const { data } = await supabase.rpc("delete_league", { p_league_id: leagueId })
    const result = data as { ok: boolean; error?: string }
    if (result.ok) {
      router.push("/ligas")
    } else {
      setError("No se pudo eliminar la liga: " + (result.error ?? "error"))
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 md:px-8 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="text-green-500 animate-spin" />
      </main>
    )
  }

  if (error && !name) {
    return (
      <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
        <Link
          href={`/ligas/${leagueId}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
          <p className="text-white font-bold">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <Link
        href={`/ligas/${leagueId}`}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver a la liga
      </Link>

      <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Configurar liga</h1>
      <p className="text-gray-500 mb-8 text-sm">Cambiá lo que quieras de tu liga</p>

      <div className="space-y-6">
        {/* Datos básicos */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Datos</h2>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 resize-none"
            />
          </div>
        </section>

        {/* Color */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Color</h2>
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
        </section>

        {/* Escudo */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Escudo</h2>
            <button
              type="button"
              onClick={() => setIconSeed(randomLeagueSeed())}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Shuffle size={12} />
              Mezclar
            </button>
          </div>
          <div className="flex justify-center mb-4">
            <LeagueIcon
              config={{ style: iconStyle, seed: iconSeed }}
              bannerColor={bannerColor}
              size={80}
              className="border-2 border-white/10"
            />
          </div>
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
                  size={32}
                />
                <span className="text-[10px] text-gray-500">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Contraseña */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound size={14} className="text-yellow-400" />
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Contraseña</h2>
          </div>

          {currentHasPassword ? (
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm text-green-400">
                <KeyRound size={12} />
                Esta liga está protegida con contraseña
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cambiar contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nueva contraseña (mínimo 4 caracteres)"
                      maxLength={50}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removePassword}
                    onChange={(e) => setRemovePassword(e.target.checked)}
                    className="w-4 h-4 accent-red-500"
                  />
                  Quitar la contraseña (cualquiera con el código podrá entrar)
                </label>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 text-sm mb-3">
                Esta liga no tiene contraseña. Cualquiera con el código puede unirse.
              </p>
              <label className="block text-xs text-gray-500 mb-1">Agregar contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Contraseña (mínimo 4 caracteres)"
                  maxLength={50}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Comodines */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                <h2 className="text-white font-bold text-sm">Comodines</h2>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Todo o Nada, Escudo y Ladrón. Si los desactivás, esta liga
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
        </section>

        {/* Opciones avanzadas */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-400" />
                <h2 className="text-white font-bold text-sm">Opciones avanzadas</h2>
              </div>
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
            <div className="space-y-1.5 pt-3 border-t border-white/10">
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
        </section>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Guardar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-black py-3.5 rounded-xl transition-colors"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
        </button>

        {/* Zona peligrosa */}
        <div className="border-t border-red-500/20 pt-6 mt-12">
          <h2 className="flex items-center gap-2 text-red-400 text-sm font-bold uppercase tracking-wider mb-3">
            <AlertTriangle size={14} />
            Zona peligrosa
          </h2>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={16} className="text-red-400" />
                <div className="text-left">
                  <p className="text-white text-sm font-medium">Eliminar liga</p>
                  <p className="text-gray-500 text-xs">
                    Borra la liga y todas sus predicciones permanentemente
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-bold text-sm">¿Estás seguro?</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Esta acción es <strong>irreversible</strong>. Vas a borrar:
                  </p>
                  <ul className="text-gray-400 text-xs mt-2 space-y-1 list-disc list-inside">
                    <li>La liga y su configuración</li>
                    <li>Todas las predicciones hechas en esta liga</li>
                    <li>Los brackets de los miembros</li>
                    <li>La actividad y notificaciones relacionadas</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Escribí <span className="font-mono font-bold text-red-400">ELIMINAR</span> para confirmar
                </label>
                <input
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  className="w-full bg-black/40 border border-red-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500/60 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteText("")
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteText !== "ELIMINAR" || deleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
                >
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  Eliminar liga
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
