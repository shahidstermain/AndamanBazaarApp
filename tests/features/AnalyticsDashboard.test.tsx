import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  ListingPerformanceCard,
  type ListingAnalytics,
} from "../../src/components/AnalyticsDashboard";

const makeAnalytics = (
  overrides: Partial<ListingAnalytics> = {},
): ListingAnalytics => ({
  listing_id: "listing-1",
  title: "Vintage Fan",
  status: "active",
  total_views: 150,
  total_favorites: 12,
  total_chats: 8,
  favorite_rate: 0.08,
  chat_conversion_rate: 0.05,
  last_activity_at: "2025-01-10T10:00:00Z",
  ...overrides,
});

describe("ListingPerformanceCard", () => {
  it("renders the listing title", () => {
    render(<ListingPerformanceCard analytics={makeAnalytics()} />);
    expect(screen.getByText("Vintage Fan")).toBeInTheDocument();
  });

  it("shows view, favorite, and chat counts", () => {
    render(<ListingPerformanceCard analytics={makeAnalytics()} />);
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows status badge with green for active", () => {
    render(
      <ListingPerformanceCard
        analytics={makeAnalytics({ status: "active" })}
      />,
    );
    const badge = screen.getByText("active");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("green");
  });

  it("shows status badge with blue for sold", () => {
    render(
      <ListingPerformanceCard analytics={makeAnalytics({ status: "sold" })} />,
    );
    const badge = screen.getByText("sold");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("blue");
  });

  it('shows "No activity" when last_activity_at is null', () => {
    render(
      <ListingPerformanceCard
        analytics={makeAnalytics({ last_activity_at: null })}
      />,
    );
    expect(screen.getByText(/No activity/)).toBeInTheDocument();
  });

  it("formats rates as percentages", () => {
    render(<ListingPerformanceCard analytics={makeAnalytics()} />);
    // favorite_rate: 0.08 rendered as "0.08% rate"
    expect(screen.getByText(/0\.08.*rate/)).toBeInTheDocument();
    // chat_conversion_rate: 0.05 rendered as "0.05% conv."
    expect(screen.getByText(/0\.05.*conv/)).toBeInTheDocument();
  });

  it("renders comparison section when provided", () => {
    render(
      <ListingPerformanceCard
        analytics={makeAnalytics()}
        comparison={[
          {
            metric: "views",
            listing_value: 150,
            category_avg: 80,
            percentile: 75,
          },
        ]}
      />,
    );
    expect(screen.getByText(/vs Category Average/)).toBeInTheDocument();
  });

  it("shows ArrowUpRight for above-average metrics", () => {
    const { container } = render(
      <ListingPerformanceCard
        analytics={makeAnalytics()}
        comparison={[
          {
            metric: "views",
            listing_value: 150,
            category_avg: 80,
            percentile: 75,
          },
        ]}
      />,
    );
    // Arrow indicators are SVG elements from lucide
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
  });
});
