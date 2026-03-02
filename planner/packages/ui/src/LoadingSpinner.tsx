"use client";
import React from "react";
import { cn } from "./utils";

export interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message = "Generating your itinerary…", className }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
      {/* Animated island waves */}
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-teal-100 animate-ping opacity-75" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-3xl shadow-lg">
          🏝️
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-2">{message}</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        Our AI is crafting a personalised Andaman adventure just for you. This takes 10–20 seconds.
      </p>

      {/* Progress dots */}
      <div className="flex gap-1.5 mt-5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
