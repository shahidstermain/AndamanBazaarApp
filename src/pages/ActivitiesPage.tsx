import React, { useState, Suspense } from 'react';
import { ActivityFilters } from '../components/Activities/ActivityFilters';
import { ActivityList } from '../components/Activities/ActivityList';
import { useActivities } from '../hooks/useActivities';
import { ActivityFilterParams, UserPreferences } from '../types';
import { Map, List, SlidersHorizontal, Loader2 } from 'lucide-react';

const ActivityMap = React.lazy(() => import('../components/Activities/ActivityMap'));

const MapSkeleton = () => (
  <div className="h-[calc(100vh-160px)] w-full rounded-[40px] border border-warm-100 bg-warm-50 flex flex-col items-center justify-center animate-pulse">
    <Map size={48} className="text-warm-300 mb-4" />
    <div className="h-4 w-32 bg-warm-200 rounded-lg"></div>
  </div>
);

export const ActivitiesPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  const [filters, setFilters] = useState<ActivityFilterParams>({
    islands: [],
    types: [],
    budgetRange: [0, 10000],
    durationRange: [0, 480],
    minRating: 0
  });

  const [mockUserPrefs] = useState<UserPreferences>({
    budget: 5000,
    interests: ['Scuba Diving', 'Trekking'],
    persona: 'Adventure',
    groupType: 'solo'
  });

  const { activities, isLoading } = useActivities(filters, mockUserPrefs);

  return (
    <div className="min-h-screen bg-warm-50/50 pt-24 pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-midnight-900 tracking-tight mb-2">
              Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-400">Andaman</span>
            </h1>
            <p className="text-warm-500 font-bold max-w-xl text-lg">
              Find experiences perfectly matched to your budget and travel style.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-warm-200 shadow-sm w-full md:w-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 md:w-32 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                viewMode === 'list' 
                  ? 'bg-midnight-900 text-white shadow-md' 
                  : 'text-warm-500 hover:text-midnight-900 hover:bg-warm-50'
              }`}
            >
              <List size={16} /> List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 md:w-32 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                viewMode === 'map' 
                  ? 'bg-teal-500 text-white shadow-md' 
                  : 'text-warm-500 hover:text-midnight-900 hover:bg-warm-50'
              }`}
            >
              <Map size={16} /> Map
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Filters Sidebar */}
          <div className="lg:col-span-3">
            <ActivityFilters 
              filters={filters} 
              setFilters={setFilters} 
              isOpen={isFiltersOpen}
              setIsOpen={setIsFiltersOpen}
            />
          </div>

          {/* Results Area */}
          <div className="lg:col-span-9">
            {viewMode === 'list' ? (
              <ActivityList activities={activities} isLoading={isLoading} />
            ) : (
              <Suspense fallback={<MapSkeleton />}>
                <ActivityMap activities={activities} />
              </Suspense>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
