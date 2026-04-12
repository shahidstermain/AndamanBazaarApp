import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TermsOfService } from "../src/pages/TermsOfService";

describe("Terms of Service", () => {
  it("renders the safety warning", () => {
    render(
      <MemoryRouter>
        <TermsOfService />
      </MemoryRouter>,
    );
    const warning = screen.getByText(/All transactions are at your own risk/i);
    expect(warning).toBeInTheDocument();
  });
});
