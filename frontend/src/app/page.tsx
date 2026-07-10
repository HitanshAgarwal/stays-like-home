const CITIES = ["Jaipur", "Goa", "Manali", "Bengaluru", "Mumbai", "Udaipur", "Kochi", "Shimla"];

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      {/* hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-accent-soft to-muted px-6 py-12 sm:px-12 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Find a place that feels like home
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            Browse stays across India — from Himalayan cabins to beachfront villas. Book in a few
            taps.
          </p>
        </div>
      </section>

      {/* city chips */}
      <nav aria-label="Popular destinations" className="mt-8 flex flex-wrap gap-2">
        {CITIES.map((city) => (
          <span
            key={city}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft"
          >
            {city}
          </span>
        ))}
      </nav>

      {/* listing grid placeholder */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-ink">Explore stays</h2>
        <p className="mt-1 text-sm text-ink-faint">
          Listings will load here once the explore feed is wired up.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ListingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] w-full rounded-xl bg-muted" />
      <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
    </div>
  );
}
