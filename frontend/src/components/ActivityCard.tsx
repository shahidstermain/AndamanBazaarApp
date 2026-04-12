import { Link } from "react-router-dom";
import type { Activity } from "../types";

type ActivityCardProps = {
  activity: Activity;
  onRequestBooking?: (activity: Activity) => void;
};

export const ActivityCard = ({ activity, onRequestBooking }: ActivityCardProps) => {
  const image =
    activity.images[0] ?? "https://images.unsplash.com/photo-1507525428034-b723cf961d3e";

  return (
    <article className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <img
        src={image}
        alt={`${activity.title} in ${activity.location}`}
        className="h-48 w-full object-cover"
      />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">{activity.title}</h3>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            {activity.location}
          </span>
        </div>
        <p className="text-sm text-slate-600">{activity.description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {activity.types.map((type) => (
            <span key={type} className="rounded-full bg-slate-100 px-2 py-1">
              {type}
            </span>
          ))}
        </div>
        <p className="text-sm font-medium">
          ₹{activity.price_min.toLocaleString()} - ₹{activity.price_max.toLocaleString()}
        </p>
        <div className="flex items-center justify-between">
          <Link to={`/activities/${activity.slug}`} className="text-sm font-semibold text-blue-700">
            View details
          </Link>
          <button
            type="button"
            onClick={() => onRequestBooking?.(activity)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Request Booking
          </button>
        </div>
      </div>
    </article>
  );
};
