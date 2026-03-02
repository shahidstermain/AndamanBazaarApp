import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Andaman Planner Pro",
  description:
    "AI-powered Andaman & Nicobar Islands trip planner. Create a personalised day-by-day itinerary in seconds.",
  openGraph: {
    title: "Andaman Planner Pro",
    description: "AI-powered Andaman trip itinerary generator",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  );
}
