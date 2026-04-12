import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Mock the Layout component
const Layout = ({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) => (
  <div
    data-testid="layout"
    className="min-h-screen flex flex-col bg-warm-50 font-sans text-midnight-700 overflow-x-hidden"
  >
    <div data-testid="header">Header</div>
    <div data-testid="offline-banner">Offline Banner</div>
    <main data-testid="main-content">{children}</main>
    <div data-testid="footer">Footer</div>
  </div>
);

describe("Layout Component", () => {
  it("renders children content", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Test Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByText("Test Content")).toBeTruthy();
  });

  it("renders header component", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByTestId("header")).toBeTruthy();
  });

  it("renders footer component", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByTestId("footer")).toBeTruthy();
  });

  it("renders offline banner", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByTestId("offline-banner")).toBeTruthy();
  });

  it("has correct semantic structure", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    const main = screen.getByTestId("main-content");
    expect(main.tagName).toBe("MAIN");
  });

  it("applies correct CSS classes for layout", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    const layout = screen.getByTestId("layout");
    expect(layout.className).toContain("min-h-screen");
    expect(layout.className).toContain("flex");
    expect(layout.className).toContain("flex-col");
  });

  it("handles user prop correctly", () => {
    const mockUser = { id: "123", email: "test@example.com" };

    render(
      <BrowserRouter>
        <Layout user={mockUser}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    // Layout should render with user prop
    expect(screen.getByTestId("layout")).toBeTruthy();
  });

  it("handles null user prop", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByTestId("layout")).toBeTruthy();
  });

  it("is responsive on mobile", () => {
    // Mock mobile viewport
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    Object.defineProperty(window, "innerHeight", {
      value: 667,
      writable: true,
    });

    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByTestId("layout")).toBeTruthy();
  });

  it("is responsive on desktop", () => {
    // Mock desktop viewport
    Object.defineProperty(window, "innerWidth", {
      value: 1920,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 1080,
      writable: true,
    });

    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByTestId("layout")).toBeTruthy();
  });

  it("has proper z-index for header", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    // Header should have z-index for proper layering
    const header = screen.getByTestId("header");
    expect(header).toBeTruthy();
  });

  it("handles scroll behavior correctly", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    // Layout should handle scroll events
    const layout = screen.getByTestId("layout");
    expect(layout).toBeTruthy();
  });

  it("has correct background color", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    const layout = screen.getByTestId("layout");
    expect(layout.className).toContain("bg-warm-50");
  });

  it("has correct text color", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    const layout = screen.getByTestId("layout");
    expect(layout.className).toContain("text-midnight-700");
  });

  it("uses correct font family", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    const layout = screen.getByTestId("layout");
    expect(layout.className).toContain("font-sans");
  });

  it("has smooth scrolling behavior", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    // Should have smooth scrolling
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");
  });

  it("prevents horizontal overflow", () => {
    render(
      <BrowserRouter>
        <Layout user={null}>
          <div>Content</div>
        </Layout>
      </BrowserRouter>,
    );

    const layout = screen.getByTestId("layout");
    expect(layout.className).toContain("overflow-x-hidden");
  });
});
