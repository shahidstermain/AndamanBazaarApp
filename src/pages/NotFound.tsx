import React from "react";
import { Link } from "react-router-dom";
import { Home, Search, ArrowLeft } from "lucide-react";

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-8xl animate-float">🏝️</div>

        <div className="space-y-3">
          <h1 className="text-6xl font-heading font-black text-midnight-700 tracking-tight">
            404
          </h1>
          <h2 className="text-xl font-heading font-bold text-midnight-700">
            Island Not Found
          </h2>
          <p className="text-warm-400 text-sm leading-relaxed max-w-xs mx-auto">
            Looks like this page drifted out to sea. Let's get you back to
            familiar shores.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="btn-primary text-sm py-3 px-6 gap-2">
            <Home size={16} /> Go Home
          </Link>
          <Link
            to="/listings"
            className="btn-secondary text-sm py-3 px-6 gap-2"
          >
            <Search size={16} /> Browse Listings
          </Link>
        </div>
      </div>
    </div>
  );
};
