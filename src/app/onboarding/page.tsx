"use client"

export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, X, Shuffle } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  AVATAR_STYLES,
  AVATAR_BACKGROUNDS,
  DEFAULT_AVATAR,
  randomSeed,
  type AvatarConfig,
} from "@/lib/avatar"
import Avatar from "@/components/Avatar"

const schema = z.object({
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
  display_name: z.string().min(2, "Mínimo 2 caracteres").max(30, "Máximo 30 caracteres"),
})

type FormData = z.infer<typeof schema>

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<"identity" | "avatar">("identity")
  const [loading, setLoading] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [avatar, setAvatar] = useState<AvatarConfig>({
    ...DEFAULT_AVATAR,
    seed: randomSeed(),
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const username = watch("username")

  async function checkUsername(value: string) {
    if (!value || value.length < 3) {
      setUsernameAvailable(null)
      return
    }
    setCheckingUsername(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", value.toLowerCase())
      .single()
    setUsernameAvailable(!data)
    setCheckingUsername(false)
  }

  async function onSubmit(data: FormData) {
    if (!usernameAvailable) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username: data.username.toLowerCase(),
      display_name: data.display_name,
      avatar_config: avatar,
    })

    if (!error) {
      await supabase.from("league_members").insert({
        league_id: "00000000-0000-0000-0000-000000000001",
        user_id: user.id,
      })
      router.push("/dashboard")
    } else {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-3xl font-black text-white tracking-tight">
            GOL<span className="text-green-500">AZO</span>
          </span>
          <p className="text-gray-500 mt-1 text-sm">Configurá tu perfil</p>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className={`flex-1 h-1.5 rounded-full ${step === "identity" ? "bg-green-500" : "bg-green-500"}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step === "avatar" ? "bg-green-500" : "bg-white/10"}`} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === "identity" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
              <h1 className="text-xl font-bold text-white">¿Cómo te llamás?</h1>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Nombre visible</label>
                <input
                  {...register("display_name")}
                  placeholder="Ej: El Matador"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
                />
                {errors.display_name && <p className="text-red-400 text-xs mt-1">{errors.display_name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nombre de usuario <span className="text-gray-600">(único en Golazo)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">@</span>
                  <input
                    {...register("username")}
                    placeholder="tuusuario"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
                    onChange={(e) => {
                      register("username").onChange(e)
                      checkUsername(e.target.value)
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && <Loader2 size={16} className="animate-spin text-gray-500" />}
                    {!checkingUsername && usernameAvailable === true && <Check size={16} className="text-green-500" />}
                    {!checkingUsername && usernameAvailable === false && <X size={16} className="text-red-400" />}
                  </div>
                </div>
                {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
                {usernameAvailable === false && <p className="text-red-400 text-xs mt-1">Este username ya está en uso</p>}
                {usernameAvailable === true && <p className="text-green-400 text-xs mt-1">¡Disponible!</p>}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (username && !avatar.seed) {
                    setAvatar((a) => ({ ...a, seed: username }))
                  }
                  setStep("avatar")
                }}
                disabled={!usernameAvailable || !!errors.username || !username}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-colors"
              >
                Siguiente → Elegí tu avatar
              </button>
            </div>
          )}

          {step === "avatar" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep("identity")}
                  className="text-gray-500 hover:text-white transition-colors text-sm"
                >
                  ← Volver
                </button>
                <h1 className="text-xl font-bold text-white">Tu avatar</h1>
              </div>

              {/* Preview */}
              <div className="flex justify-center">
                <Avatar config={avatar} size={120} className="border-4 border-green-500/50" />
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setAvatar((a) => ({ ...a, seed: randomSeed() }))}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
                >
                  <Shuffle size={14} />
                  Mezclar
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Estilo</label>
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
                      <Avatar config={{ ...avatar, style: s.value }} size={40} />
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

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Color de fondo</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_BACKGROUNDS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatar((a) => ({ ...a, backgroundColor: c }))}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: `#${c}`,
                        borderColor: avatar.backgroundColor === c ? "white" : "transparent",
                        transform: avatar.backgroundColor === c ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-bold py-3.5 rounded-xl transition-colors"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? "Creando perfil..." : "¡A jugar!"}
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  )
}
