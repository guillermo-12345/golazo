// Genera código de invitación de 6 caracteres, fácil de leer (sin O/0, I/1)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generateInviteCode(length = 6): string {
  let code = ""
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return code
}
