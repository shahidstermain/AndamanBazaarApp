import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrivacyPolicy } from "../src/pages/PrivacyPolicy";

describe("PrivacyPolicy", () => {
  it("renders the main heading", () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>,
    );
    const heading = screen.getByText(/Privacy Policy/i);
    expect(heading).toBeInTheDocument();
  });
});
