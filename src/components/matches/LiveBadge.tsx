type Props = {
  minute?: number | null
  size?: "sm" | "md"
}

export default function LiveBadge({ minute, size = "sm" }: Props) {
  const padding = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1"
  const textSize = size === "sm" ? "text-[10px]" : "text-xs"

  return (
    <span
      className={`inline-flex items-center gap-1 bg-red-500/15 border border-red-500/40 rounded-full ${padding}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
      </span>
      <span className={`text-red-300 font-bold uppercase tracking-wider ${textSize}`}>
        EN VIVO
        {minute !== null && minute !== undefined && (
          <span className="ml-1 font-mono text-red-200">{minute}&apos;</span>
        )}
      </span>
    </span>
  )
}
