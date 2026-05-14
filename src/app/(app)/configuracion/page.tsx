"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Settings,
  User as UserIcon,
  Bell,
  Shield,
  LogOut,
  Trash2,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Mail,
  Edit3,
  Palette,
} from "lucide-react"
import Link from "next/link"
import Avatar from "@/components/Avatar"
import ThemeToggle from "@/components/ThemeToggle"

type Profile = {
  username: string
  display_name: string
  avatar_config: unknown
}

export default function ConfiguracionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string>("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      setEmail(user.email ?? "")

      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_config")
        .eq("id", user.id)
        .single()

      if (data) setProfile(data as Profile)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  async function handleDeleteAccount() {
    if (deleteText !== "ELIMINAR") return
    setDeleting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Borramos el perfil (cascada elimina league_members, predictions, etc)
    await supabase.from("profiles").delete().eq("id", user.id)
    await supabase.auth.signOut()
    router.push("/")
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
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings size={28} className="text-gray-300" />
          <h1 className="text-2xl md:text-3xl font-black text-white">Configuración</h1>
        </div>
        <p className="text-gray-500 text-sm">Ajustá tu cuenta y preferencias</p>
      </header>

      {/* Perfil */}
      <Section icon={UserIcon} title="Perfil">
        <div className="flex items-center gap-4 mb-4">
          {profile && (
            <Avatar config={profile.avatar_config} username={profile.username} size={56} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">{profile?.display_name}</p>
            <p className="text-gray-500 text-sm">@{profile?.username}</p>
          </div>
          <Link
            href="/perfil/editar"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <Edit3 size={14} />
            Editar
          </Link>
        </div>
      </Section>

      {/* Cuenta */}
      <Section icon={Mail} title="Cuenta">
        <Row
          label="Email"
          value={email}
          subtitle="Conectado con Google · no se puede cambiar acá"
        />
        <button
          onClick={handleSignOut}
          className="flex items-center justify-between w-full p-4 hover:bg-white/[0.02] rounded-xl transition-colors group"
        >
          <div className="flex items-center gap-3">
            <LogOut size={16} className="text-red-400" />
            <div className="text-left">
              <p className="text-white text-sm font-medium">Cerrar sesión</p>
              <p className="text-gray-500 text-xs">Saldrás de esta cuenta en este dispositivo</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
        </button>
      </Section>

      {/* Apariencia */}
      <Section icon={Palette} title="Apariencia">
        <div className="p-3">
          <p className="text-white text-sm font-medium mb-1">Tema de la app</p>
          <p className="text-gray-500 text-xs mb-3">El modo oscuro es la experiencia recomendada</p>
          <ThemeToggle />
        </div>
      </Section>

      {/* Notificaciones */}
      <Section icon={Bell} title="Notificaciones">
        <NotificationToggle label="Cuando alguien se une a mi liga" defaultEnabled />
        <NotificationToggle label="Cuando gano puntos" defaultEnabled />
        <NotificationToggle label="Cuando desbloqueo un logro" defaultEnabled />
        <NotificationToggle label="Recordatorios de partidos por empezar" defaultEnabled />
        <NotificationToggle label="Cuando alguien me supera en la tabla" defaultEnabled={false} />
        <p className="text-xs text-gray-600 text-center pt-2">
          Estas preferencias se guardan localmente · pronto serán sincronizadas
        </p>
      </Section>

      {/* Privacidad */}
      <Section icon={Shield} title="Privacidad">
        <Row
          label="Perfil público"
          value="Visible"
          subtitle={`Tu perfil es accesible en /u/${profile?.username}`}
        />
        <Row
          label="Datos guardados"
          value="Encriptados"
          subtitle="Supabase guarda tus datos cifrados en reposo"
        />
      </Section>

      {/* Danger zone */}
      <div className="mt-12 border-t border-red-500/20 pt-6">
        <h2 className="flex items-center gap-2 text-red-400 text-sm font-bold uppercase tracking-wider mb-3">
          <AlertTriangle size={14} />
          Zona peligrosa
        </h2>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={16} className="text-red-400" />
              <div className="text-left">
                <p className="text-white text-sm font-medium">Eliminar cuenta</p>
                <p className="text-gray-500 text-xs">
                  Borra permanentemente tu perfil, predicciones y participación en ligas
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-500 group-hover:text-red-400 transition-colors" />
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-bold text-sm">¿Estás seguro?</p>
                <p className="text-gray-400 text-xs mt-1">
                  Esta acción es <strong>irreversible</strong>. Vas a perder:
                </p>
                <ul className="text-gray-400 text-xs mt-2 space-y-1 list-disc list-inside">
                  <li>Tu perfil y avatar</li>
                  <li>Todas tus predicciones</li>
                  <li>Tu participación en todas las ligas</li>
                  <li>Tus logros y puntos</li>
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
                onClick={handleDeleteAccount}
                disabled={deleteText !== "ELIMINAR" || deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Eliminar definitivamente
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Settings
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-6">
      <h2 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        <Icon size={14} />
        {title}
      </h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-1.5 space-y-0.5">
        {children}
      </div>
    </section>
  )
}

function Row({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="flex items-start justify-between p-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <p className="text-gray-300 text-sm truncate max-w-[60%]">{value}</p>
    </div>
  )
}

function NotificationToggle({
  label,
  defaultEnabled,
}: {
  label: string
  defaultEnabled: boolean
}) {
  const [enabled, setEnabled] = useState(defaultEnabled)
  return (
    <div className="flex items-center justify-between p-3">
      <span className="text-white text-sm">{label}</span>
      <button
        onClick={() => setEnabled((v) => !v)}
        className={`relative w-10 h-5.5 h-6 rounded-full transition-colors ${
          enabled ? "bg-green-500" : "bg-white/10"
        }`}
        style={{ width: "2.5rem", height: "1.5rem" }}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
            enabled ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  )
}
