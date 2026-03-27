interface StatCard {
  label: string
  value: string
  description: string
  alert?: boolean
}

interface StatsGridProps {
  cards: StatCard[]
}

export function StatsGrid({ cards }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6"
        >
          <p className="text-sm font-medium text-zinc-500">{card.label}</p>
          <p
            className={`mt-2 text-3xl font-semibold ${
              card.alert ? 'text-yellow-600' : 'text-zinc-900'
            }`}
          >
            {card.value}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{card.description}</p>
        </div>
      ))}
    </div>
  )
}
