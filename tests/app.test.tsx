import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";
import { vi } from "vitest";

describe("App", () => {
  it("renders sign in link when unauthenticated", async () => {
    render(<App />);

    // Use waitFor to account for the initial loading state in App.tsx
    await waitFor(() => {
      const links = screen.getAllByText(
        (content) => content.match(/Sign In/i) !== null,
      );
      expect(links.length).toBeGreaterThan(0);
    });
  });
});
