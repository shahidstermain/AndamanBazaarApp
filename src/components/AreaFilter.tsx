import React from "react";
import { MapPin } from "lucide-react";

interface AreaFilterProps {
  selectedArea: string;
  onAreaChange: (area: string) => void;
  className?: string;
}

const ANDAMAN_AREAS = [
  { id: "all", name: "All Areas", icon: "🏝️" },
  { id: "port-blair", name: "Port Blair", icon: "🏙️" },
  { id: "havelock", name: "Havelock Island", icon: "🌊" },
  { id: "neil-island", name: "Neil Island", icon: "🏖️" },
  { id: "diglipur", name: "Diglipur", icon: "🌴" },
  { id: "rangat", name: "Rangat", icon: "🌺" },
  { id: "mayabunder", name: "Mayabunder", icon: "⛵" },
  { id: "little-andaman", name: "Little Andaman", icon: "🐚" },
  { id: "car-nicobar", name: "Car Nicobar", icon: "🥥" },
];

export const AreaFilter: React.FC<AreaFilterProps> = ({
  selectedArea,
  onAreaChange,
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-teal-600" />
        <h3 className="font-semibold text-gray-900">Filter by Area</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {ANDAMAN_AREAS.map((area) => (
          <button
            key={area.id}
            onClick={() => onAreaChange(area.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium
              transition-all duration-200 border
              ${
                selectedArea === area.id
                  ? "bg-teal-50 border-teal-500 text-teal-700"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }
            `}
          >
            <span className="text-lg">{area.icon}</span>
            <span className="truncate">{area.name}</span>
          </button>
        ))}
      </div>

      {selectedArea !== "all" && (
        <button
          onClick={() => onAreaChange("all")}
          className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          Clear filter
        </button>
      )}
    </div>
  );
};
