"use client"

import { useState } from "react"
import { Copy, Check, Share2 } from "lucide-react"

export default function InviteCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareLink() {
    const text = `Te invito a mi liga en Golazo. Código: ${code}\nUnite en golazo.app`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1">
            Código de invitación
          </p>
          <p className="text-white font-mono text-3xl font-black tracking-[0.2em]">{code}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            onClick={shareLink}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black text-sm font-bold px-3 py-2 rounded-lg transition-colors"
          >
            <Share2 size={14} />
            Compartir
          </button>
        </div>
      </div>
    </div>
  )
}
