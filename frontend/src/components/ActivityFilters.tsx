type FilterValues = {
  location: string;
  type: string;
  priceMin: string;
  priceMax: string;
};

type ActivityFiltersProps = {
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  locations: string[];
  types: string[];
};

const updateValue = (
  values: FilterValues,
  key: keyof FilterValues,
  value: string,
  onChange: (next: FilterValues) => void,
) => {
  onChange({
    ...values,
    [key]: value,
  });
};

export const ActivityFilters = ({ values, onChange, locations, types }: ActivityFiltersProps) => {
  return (
    <section aria-label="Activity filters" className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Filters</h2>
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label htmlFor="location" className="mb-1 block text-sm font-medium">
            Location
          </label>
          <select
            id="location"
            value={values.location}
            onChange={(event) => updateValue(values, "location", event.target.value, onChange)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium">
            Activity Type
          </label>
          <select
            id="type"
            value={values.type}
            onChange={(event) => updateValue(values, "type", event.target.value, onChange)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">All types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priceMin" className="mb-1 block text-sm font-medium">
            Min Price
          </label>
          <input
            id="priceMin"
            value={values.priceMin}
            onChange={(event) => updateValue(values, "priceMin", event.target.value, onChange)}
            type="number"
            min={0}
            className="w-full rounded-md border px-3 py-2"
            placeholder="e.g. 1000"
          />
        </div>
        <div>
          <label htmlFor="priceMax" className="mb-1 block text-sm font-medium">
            Max Price
          </label>
          <input
            id="priceMax"
            value={values.priceMax}
            onChange={(event) => updateValue(values, "priceMax", event.target.value, onChange)}
            type="number"
            min={0}
            className="w-full rounded-md border px-3 py-2"
            placeholder="e.g. 8000"
          />
        </div>
      </div>
    </section>
  );
};

export type { FilterValues };
