export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-white/10 rounded-lg mb-2" />
        <div className="h-4 w-64 bg-white/5 rounded" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 h-24" />
        ))}
      </div>

      {/* List skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 h-16"
          />
        ))}
      </div>
    </div>
  )
}
