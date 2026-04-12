import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Home } from "../src/pages/Home";

describe("HomeView", () => {
  it("renders the main heading", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </HelmetProvider>,
    );
    await waitFor(() => {
      const heading = screen.getByRole("heading", {
        level: 1,
        name: /Buy & Sell in Paradise\./i,
      });
      expect(heading).toBeInTheDocument();
    });
  });
});
