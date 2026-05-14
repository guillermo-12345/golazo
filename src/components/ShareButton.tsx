"use client"

import { useState } from "react"
import { Share2, Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  title: string
  text: string
  url?: string
  variant?: "default" | "ghost" | "compact"
  className?: string
}

/**
 * Botón de compartir. Usa la Web Share API nativa en mobile (que abre WhatsApp,
 * Twitter, etc.). En desktop, copia al portapapeles.
 */
export default function ShareButton({ title, text, url, variant = "default", className }: Props) {
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "")
    const fullText = `${text}\n${shareUrl}`

    // Web Share API (mobile principalmente)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        setSharing(true)
        await navigator.share({ title, text, url: shareUrl })
      } catch (err) {
        // El usuario canceló o hubo error — caemos al copy
        if ((err as Error).name !== "AbortError") {
          await copyToClipboard(fullText)
        }
      } finally {
        setSharing(false)
      }
    } else {
      // Desktop: copiar al portapapeles
      await copyToClipboard(fullText)
    }
  }

  async function copyToClipboard(content: string) {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback si no hay clipboard API
    }
  }

  if (variant === "compact") {
    return (
      <button
        onClick={handleShare}
        disabled={sharing}
        className={cn(
          "w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors",
          className
        )}
        aria-label="Compartir"
      >
        {copied ? (
          <Check size={14} className="text-green-400" />
        ) : (
          <Share2 size={14} className="text-gray-300" />
        )}
      </button>
    )
  }

  if (variant === "ghost") {
    return (
      <button
        onClick={handleShare}
        disabled={sharing}
        className={cn(
          "inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors",
          className
        )}
      >
        {copied ? (
          <>
            <Check size={14} className="text-green-400" />
            <span className="text-green-400">¡Copiado!</span>
          </>
        ) : (
          <>
            <Share2 size={14} />
            Compartir
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className={cn(
        "inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors",
        className
      )}
    >
      {copied ? (
        <>
          <Check size={14} className="text-green-400" />
          ¡Copiado!
        </>
      ) : (
        <>
          {variant === "default" ? <Share2 size={14} /> : <Copy size={14} />}
          Compartir
        </>
      )}
    </button>
  )
}
