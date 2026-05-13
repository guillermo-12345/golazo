"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  AVATAR_STYLES,
  AVATAR_BACKGROUNDS,
  DEFAULT_AVATAR,
  randomSeed,
  type AvatarConfig,
} from "@/lib/avatar"
import Avatar from "@/components/Avatar"
import { ArrowLeft, Loader2, Shuffle, Check } from "lucide-react"
import Link from "next/link"

export default function EditarPerfilPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (data) {
        const p = data as { display_name: string; bio: string | null; avatar_config: unknown; username: string }
        setDisplayName(p.display_name ?? "")
        setBio(p.bio ?? "")
        const cfg = (p.avatar_config ?? {}) as Partial<AvatarConfig>
        setAvatar({
          style: cfg.style ?? DEFAULT_AVATAR.style,
          seed: cfg.seed ?? p.username ?? DEFAULT_AVATAR.seed,
          backgroundColor: cfg.backgroundColor ?? DEFAULT_AVATAR.backgroundColor,
        })
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio: bio || null,
        avatar_config: avatar,
      })
      .eq("id", user.id)

    if (!error) {
      setSaved(true)
      setTimeout(() => {
        router.push("/perfil")
        router.refresh()
      }, 800)
    } else {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 md:px-8 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="text-green-500 animate-spin" />
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver
      </Link>

      <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Editar perfil</h1>
      <p className="text-gray-500 mb-8 text-sm">Personalizá cómo te ven los demás</p>

      <div className="space-y-6">
        {/* Avatar preview + customizer */}
        <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
            Avatar
          </h2>

          {/* Preview */}
          <div className="flex justify-center mb-6">
            <div
              className="rounded-full p-1 transition-all"
              style={{
                background: `linear-gradient(135deg, #${avatar.backgroundColor}, #${avatar.backgroundColor}55)`,
              }}
            >
              <Avatar config={avatar} size={140} />
            </div>
          </div>

          {/* Botón shuffle */}
          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={() => setAvatar((a) => ({ ...a, seed: randomSeed() }))}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              <Shuffle size={14} />
              Mezclar
            </button>
          </div>

          {/* Estilo */}
          <div className="mb-5">
            <p className="text-xs font-medium text-gray-400 mb-2">Estilo</p>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setAvatar((a) => ({ ...a, style: s.value }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    avatar.style === s.value
                      ? "border-green-500/60 bg-green-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <Avatar
                    config={{ ...avatar, style: s.value }}
                    size={44}
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      avatar.style === s.value ? "text-green-400" : "text-gray-500"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Color de fondo */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Color de fondo</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_BACKGROUNDS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatar((a) => ({ ...a, backgroundColor: c }))}
                  className="w-9 h-9 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: `#${c}`,
                    borderColor: avatar.backgroundColor === c ? "white" : "transparent",
                    transform: avatar.backgroundColor === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Info personal */}
        <section className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Info personal
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nombre visible
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Bio <span className="text-gray-600">(opcional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={150}
              placeholder="Contá algo sobre vos. Tu equipo, tu cábala, lo que quieras."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors resize-none"
            />
            <p className="text-right text-xs text-gray-600 mt-1">{bio.length}/150</p>
          </div>
        </section>

        {/* Guardar */}
        <button
          onClick={handleSave}
          disabled={saving || !displayName.trim()}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-4 rounded-xl transition-colors"
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {saved && <Check size={18} />}
          {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
        </button>
      </div>
    </main>
  )
}
