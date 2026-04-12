import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  VouchBadge,
  VouchList,
  VouchModal,
  type Vouch,
} from "../../src/components/VouchComponents";

// ── VouchBadge ────────────────────────────────────────────────────────────────

describe("VouchBadge", () => {
  it("renders nothing when vouchCount is 0", () => {
    const { container } = render(<VouchBadge vouchCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders singular for count of 1", () => {
    render(<VouchBadge vouchCount={1} />);
    expect(screen.getByText("1 vouch")).toBeInTheDocument();
  });

  it("renders plural for count > 1", () => {
    render(<VouchBadge vouchCount={3} />);
    expect(screen.getByText("3 vouches")).toBeInTheDocument();
  });
});

// ── VouchList ─────────────────────────────────────────────────────────────────

const mockVouches: Vouch[] = [
  {
    vouch_id: "v1",
    voucher_id: "user-1",
    voucher_name: "Rahul",
    voucher_trust_level: "legend",
    vouch_message: "Trusted seller!",
    created_at: "2024-01-01T00:00:00Z",
    days_remaining: 25,
  },
  {
    vouch_id: "v2",
    voucher_id: "user-2",
    voucher_name: "Priya",
    voucher_trust_level: "verified",
    vouch_message: "",
    created_at: "2024-01-02T00:00:00Z",
    days_remaining: 10,
  },
];

describe("VouchList", () => {
  it("renders nothing when vouches is empty", () => {
    const { container } = render(<VouchList vouches={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders vouch entries with names", () => {
    render(<VouchList vouches={mockVouches} />);
    expect(screen.getByText("Rahul")).toBeInTheDocument();
    expect(screen.getByText("Priya")).toBeInTheDocument();
  });

  it("renders vouch message when present", () => {
    render(<VouchList vouches={mockVouches} />);
    expect(screen.getByText('"Trusted seller!"')).toBeInTheDocument();
  });

  it("shows days remaining", () => {
    render(<VouchList vouches={mockVouches} />);
    expect(screen.getByText("25d left")).toBeInTheDocument();
    expect(screen.getByText("10d left")).toBeInTheDocument();
  });
});

// ── VouchModal ────────────────────────────────────────────────────────────────

describe("VouchModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <VouchModal
        isOpen={false}
        onClose={vi.fn()}
        onVouch={vi.fn()}
        voucheeName="Alice"
        availableSlots={2}
        canVouch={true}
        userTrustLevel="verified"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows newbie blocked message when canVouch is false and trust level is newbie", () => {
    render(
      <VouchModal
        isOpen={true}
        onClose={vi.fn()}
        onVouch={vi.fn()}
        voucheeName="Alice"
        availableSlots={0}
        canVouch={false}
        userTrustLevel="newbie"
      />,
    );
    expect(screen.getByText("Cannot Vouch")).toBeInTheDocument();
    expect(screen.getByText(/Verified or Legend/)).toBeInTheDocument();
  });

  it("shows vouch form when canVouch is true", () => {
    render(
      <VouchModal
        isOpen={true}
        onClose={vi.fn()}
        onVouch={vi.fn()}
        voucheeName="Alice"
        availableSlots={2}
        canVouch={true}
        userTrustLevel="verified"
      />,
    );
    expect(screen.getByText(/Vouch for Alice/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Why do you vouch/)).toBeInTheDocument();
  });

  it("calls onVouch with message on submit", async () => {
    const onVouch = vi.fn().mockResolvedValue(undefined);
    render(
      <VouchModal
        isOpen={true}
        onClose={vi.fn()}
        onVouch={onVouch}
        voucheeName="Alice"
        availableSlots={2}
        canVouch={true}
        userTrustLevel="verified"
      />,
    );
    const textarea = screen.getByPlaceholderText(/Why do you vouch/);
    fireEvent.change(textarea, { target: { value: "Great seller" } });
    fireEvent.click(screen.getByRole("button", { name: /Vouch/ }));
    await waitFor(() => expect(onVouch).toHaveBeenCalledWith("Great seller"));
  });

  it("shows error message when onVouch throws", async () => {
    const onVouch = vi.fn().mockRejectedValue(new Error("Server error"));
    render(
      <VouchModal
        isOpen={true}
        onClose={vi.fn()}
        onVouch={onVouch}
        voucheeName="Alice"
        availableSlots={2}
        canVouch={true}
        userTrustLevel="verified"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Vouch/ }));
    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument(),
    );
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <VouchModal
        isOpen={true}
        onClose={onClose}
        onVouch={vi.fn()}
        voucheeName="Alice"
        availableSlots={2}
        canVouch={true}
        userTrustLevel="verified"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
