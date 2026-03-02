import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadFormModal } from "./LeadFormModal";

describe("LeadFormModal", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ok: true }),
      }),
    );
  });

  it("shows validation and submits successfully", async () => {
    const user = userEvent.setup();

    render(
      <LeadFormModal
        isOpen
        onClose={() => undefined}
        availableActivities={["Scuba Diving", "Jet Skiing"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Submit Request" }));
    expect(await screen.findByText("Please enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Consent is required to continue.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name *"), "Ananya Das");
    await user.type(screen.getByLabelText("Phone *"), "9999977777");
    await user.type(screen.getByLabelText("Preferred Date *"), "2026-08-20");
    await user.selectOptions(screen.getByLabelText("Location *"), "North Bay");
    await user.selectOptions(screen.getByLabelText("Swimming Ability *"), "Beginner");
    await user.selectOptions(screen.getByLabelText("Budget Range (per person) *"), "10000");
    await user.click(screen.getByLabelText("Scuba Diving"));
    await user.click(
      screen.getByLabelText(
        "I agree to be contacted by AndamanBazaar regarding this booking enquiry. *",
      ),
    );

    await user.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(
      await screen.findByText(
        "Thank you for your submission. We will get back to you as soon as possible. We usually reach out within 12 hours of submission. Kindly wait.",
      ),
    ).toBeInTheDocument();
  });
});
