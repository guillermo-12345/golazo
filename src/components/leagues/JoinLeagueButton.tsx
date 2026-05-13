"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, UserPlus } from "lucide-react"

export default function JoinLeagueButton({ leagueId }: { leagueId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const { error } = await supabase.from("league_members").insert({
      league_id: leagueId,
      user_id: user.id,
    })

    if (!error) {
      router.refresh()
    } else {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-black font-black py-3.5 rounded-xl transition-colors"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
      {loading ? "Uniéndome..." : "Unirme a esta liga"}
    </button>
  )
}
