import { LOCATION_HOTSPOTS, WATER_ADVENTURE_GUIDE } from "../lib/waterAdventureGuide";

type AdventureGuideSectionProps = {
  onPlanRequest: () => void;
};

export const AdventureGuideSection = ({ onPlanRequest }: AdventureGuideSectionProps) => {
  return (
    <section className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
      <header className="space-y-3">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold">Complete Water Adventure Guide</h2>
            <p className="mt-1 text-slate-600">
              Browse every major water activity across Port Blair and the Andaman Islands, then
              submit one form to get a tailored callback.
            </p>
          </div>
          <button
            type="button"
            onClick={onPlanRequest}
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Get Custom Plan
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {WATER_ADVENTURE_GUIDE.map((item) => (
          <article key={item.title} className="rounded-xl border bg-slate-50 p-4">
            <h3 className="text-lg font-semibold">
              <span aria-hidden="true" className="mr-2">
                {item.emoji}
              </span>
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-slate-700">{item.overview}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="font-medium text-slate-900">Top spots</dt>
                <dd className="text-slate-700">{item.keyLocations}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Duration</dt>
                <dd className="text-slate-700">{item.duration}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Indicative pricing</dt>
                <dd className="text-slate-700">{item.priceNote}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-900">Best for</dt>
                <dd className="text-slate-700">{item.suitability}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">Location Hotspots at a Glance</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full border-collapse bg-white text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Location</th>
                <th className="px-3 py-2 font-semibold">Key Activities</th>
              </tr>
            </thead>
            <tbody>
              {LOCATION_HOTSPOTS.map((spot) => (
                <tr key={spot.location} className="border-t">
                  <td className="px-3 py-2 font-medium">{spot.location}</td>
                  <td className="px-3 py-2">{spot.activities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
};
