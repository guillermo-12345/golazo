// Email único con acceso al panel de administración.
export const ADMIN_EMAIL = "guillermo.ibanezc@gmail.com"

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().trim() === ADMIN_EMAIL
}
