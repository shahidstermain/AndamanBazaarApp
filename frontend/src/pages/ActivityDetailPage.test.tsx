import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityDetailPage } from "./ActivityDetailPage";

const detailResponse = {
  data: {
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
    operator: {
      id: "op_1",
      name: "North Bay Ocean Adventures",
      email: "northbay@example.com",
      phone: "+91-9531900001",
      location: "North Bay",
    },
  },
};

describe("ActivityDetailPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(detailResponse),
      }),
    );
  });

  it("renders activity detail data", async () => {
    render(
      <MemoryRouter initialEntries={["/activities/scuba-diving-north-bay"]}>
        <Routes>
          <Route path="/activities/:slug" element={<ActivityDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Scuba Diving" })).toBeInTheDocument();
    expect(screen.getByText("North Bay Ocean Adventures")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request Booking" })).toBeInTheDocument();
  });
});
