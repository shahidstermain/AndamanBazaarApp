import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock(
  "../../src/lib/supabase",
  () => import("../../src/lib/__mocks__/supabase"),
);

import {
  supabase,
  isSupabaseConfigured,
} from "../../src/lib/__mocks__/supabase";
import { AuthView } from "../../src/pages/AuthView";
import { COPY } from "../../src/lib/localCopy";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderAuth() {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(AuthView)),
  );
}

describe("AuthView extended flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {},
      error: null,
    } as any);
  });

  it("redirects to home when a session already exists", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: "token-1" } },
      error: null,
    } as any);

    renderAuth();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows localized wrong-password message for invalid login credentials", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    } as any);

    renderAuth();

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Secret Password/i), {
      target: { value: "wrong-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In Securely/i }));

    await waitFor(() => {
      expect(screen.getByText(COPY.AUTH.WRONG_PASSWORD)).toBeTruthy();
    });
  });

  it("shows email-not-confirmed guidance with resend action", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Email not confirmed" },
    } as any);

    renderAuth();

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "verifyme@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Secret Password/i), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In Securely/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email Not Verified/i)).toBeTruthy();
      expect(
        screen.getByRole("button", { name: /Resend to Current Origin/i }),
      ).toBeTruthy();
    });
  });

  it("blocks signup when password is weak and does not call signUp", async () => {
    renderAuth();

    fireEvent.click(screen.getByRole("button", { name: /signup/i }));
    fireEvent.change(screen.getByLabelText(/Display Name/i), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Secret Password/i), {
      target: { value: "weak" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Create Island Account/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/○ 8\+ chars/i)).toBeTruthy();
      expect(screen.getByText(/○ Uppercase/i)).toBeTruthy();
      expect(vi.mocked(supabase.auth.signUp)).not.toHaveBeenCalled();
    });
  });
});
