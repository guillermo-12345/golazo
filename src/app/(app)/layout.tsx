import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import DashboardNav from "@/components/layout/DashboardNav"
import Footer from "@/components/Footer"
import type { Profile } from "@/types/database"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profileData) redirect("/onboarding")
  const profile = profileData as Profile
  const isAdmin = isAdminEmail(user.email)

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNav profile={profile} isAdmin={isAdmin} />
      <div className="flex-1 pt-14 md:pt-0 pb-20 md:pb-0 md:pl-64 flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </div>
  )
}
