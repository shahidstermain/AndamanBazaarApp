import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivitiesPage } from "./ActivitiesPage";

const activityResponse = {
  data: [
    {
      id: "act_1",
      slug: "scuba-diving-north-bay",
      title: "Scuba Diving",
      description: "Guided diving session with instructor.",
      location: "North Bay",
      types: ["Adventure"],
      duration_minutes: 120,
      price_min: 3500,
      price_max: 6500,
      age_min: 12,
      images: ["https://example.com/scuba.jpg"],
      safety_notes: "Instructor briefing mandatory",
      operator: null,
    },
  ],
  meta: { total: 1, page: 1, pageSize: 9, totalPages: 1 },
};

describe("ActivitiesPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(activityResponse),
      }),
    );
  });

  it("renders fetched activity list", async () => {
    render(
      <MemoryRouter>
        <ActivitiesPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "All Activities" })).toBeInTheDocument();
    expect(await screen.findByText("Scuba Diving")).toBeInTheDocument();
    expect(screen.getAllByText("North Bay").length).toBeGreaterThan(0);
  });
});
