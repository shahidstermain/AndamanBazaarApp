import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthView } from "../src/pages/AuthView";
import { MemoryRouter } from "react-router-dom";

describe("AuthView", () => {
  const renderAuth = () => {
    render(
      <MemoryRouter>
        <AuthView />
      </MemoryRouter>,
    );
  };

  it("renders the Google OAuth button", () => {
    renderAuth();
    const googleButton = screen.getByText(/Continue with Google/i);
    expect(googleButton).toBeInTheDocument();
  });

  it("switches between Sign In and Sign Up modes", () => {
    renderAuth();

    // Initially in Sign In mode
    expect(screen.getByText("Sign In Securely")).toBeInTheDocument();

    // Switch to Sign Up
    const signUpTab = screen.getByText("signup");
    fireEvent.click(signUpTab);

    expect(
      screen.getByPlaceholderText("e.g. Rahul Sharma"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create Island Account/i }),
    ).toBeInTheDocument();
  });

  it("renders login form inputs", () => {
    renderAuth();
    expect(screen.getByPlaceholderText("name@domain.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });
});
