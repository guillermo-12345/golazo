import { BADGE_CATALOG, RARITY_BORDER, RARITY_GLOW, type BadgeType } from "@/lib/badges"
import { cn } from "@/lib/utils"

type Props = {
  type: BadgeType
  size?: "sm" | "md" | "lg"
  locked?: boolean
  showName?: boolean
}

const SIZES = {
  sm: { box: "w-12 h-12", emoji: "text-xl", name: "text-[10px]" },
  md: { box: "w-16 h-16", emoji: "text-3xl", name: "text-xs" },
  lg: { box: "w-24 h-24", emoji: "text-5xl", name: "text-sm" },
}

export default function BadgeIcon({ type, size = "md", locked = false, showName = true }: Props) {
  const badge = BADGE_CATALOG[type]
  if (!badge) return null
  const s = SIZES[size]

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          s.box,
          "rounded-2xl flex items-center justify-center border-2 transition-all",
          locked
            ? "bg-white/5 border-white/10 grayscale opacity-40"
            : cn(RARITY_BORDER[badge.rarity], RARITY_GLOW[badge.rarity])
        )}
        style={
          !locked
            ? {
                background: `linear-gradient(135deg, #${badge.color}33 0%, #${badge.color}0a 100%)`,
              }
            : undefined
        }
      >
        <span className={cn(s.emoji, locked && "opacity-50")}>{locked ? "🔒" : badge.emoji}</span>
      </div>
      {showName && (
        <p
          className={cn(
            s.name,
            "font-bold text-center max-w-[80px] leading-tight",
            locked ? "text-gray-600" : "text-white"
          )}
        >
          {badge.name}
        </p>
      )}
    </div>
  )
}
