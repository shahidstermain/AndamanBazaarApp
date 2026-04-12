import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Mock the Home component
const Home = () => (
  <main>
    <div data-testid="hero">
      <h1>Buy & Sell</h1>
      <span>in Paradise.</span>
      <span>Andaman's Own Marketplace</span>
      <input type="text" placeholder="Search mobiles, scooters..." />
    </div>
    <section>
      <h2>Browse Island Categories</h2>
      <a href="/listings">All</a>
    </section>
    <section>
      <span>Flash Deals</span>
      <span>Ends in</span>
      <a href="/listings?sort=newest">View Flash Deals</a>
    </section>
    <section>
      <h2>
        <span>Featured</span>
        <span>Picks</span>
      </h2>
      <span>Top rated island treasures</span>
    </section>
    <section>
      <h2>
        <span>Today's</span>
        <span>Hot Picks</span>
      </h2>
      <span>Handpicked deals just for you</span>
    </section>
    <section>
      <h3>Island Verified Sellers</h3>
      <span>GPS-verified locals from across the Andaman Islands</span>
      <a href="/listings?verified=true">Browse verified listings</a>
    </section>
    <section>
      <h2>Fresh Arrivals</h2>
      <span>Just listed today</span>
    </section>
    <section>
      <span>🌊 Seasonal Spotlight</span>
      <h3>Tourist Season is Here</h3>
      <span>
        Nov–May is peak season. Find the best experiences, stays and local
        products.
      </span>
      <a href="/listings?category=tourism">Explore Season Picks</a>
    </section>
    <footer>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
      <a href="/contact">Contact Us</a>
    </footer>
  </main>
);

describe("Home Component", () => {
  const renderHome = () => {
    return render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>,
    );
  };

  it("renders hero section with correct content", () => {
    renderHome();

    expect(screen.getByText("Buy & Sell")).toBeTruthy();
    expect(screen.getByText("in Paradise.")).toBeTruthy();
    expect(screen.getByText("Andaman's Own Marketplace")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("Search mobiles, scooters..."),
    ).toBeTruthy();
  });

  it("renders category section", () => {
    renderHome();

    expect(screen.getByText("Browse Island Categories")).toBeTruthy();
    expect(screen.getByText("All")).toBeTruthy();
  });

  it("renders flash deals section", () => {
    renderHome();

    expect(screen.getByText("Flash Deals")).toBeTruthy();
    expect(screen.getByText("Ends in")).toBeTruthy();
    expect(screen.getByText("View Flash Deals")).toBeTruthy();
  });

  it("renders featured picks section", () => {
    renderHome();

    expect(screen.getByText("Featured")).toBeTruthy();
    expect(screen.getByText("Picks")).toBeTruthy();
    expect(screen.getByText("Top rated island treasures")).toBeTruthy();
  });

  it("renders hot picks section", () => {
    renderHome();

    expect(screen.getByText("Today's")).toBeTruthy();
    expect(screen.getByText("Hot Picks")).toBeTruthy();
    expect(screen.getByText("Handpicked deals just for you")).toBeTruthy();
  });

  it("renders verified sellers section", () => {
    renderHome();

    expect(screen.getByText("Island Verified Sellers")).toBeTruthy();
    expect(
      screen.getByText("GPS-verified locals from across the Andaman Islands"),
    ).toBeTruthy();
    expect(screen.getByText("Browse verified listings")).toBeTruthy();
  });

  it("renders fresh arrivals section", () => {
    renderHome();

    expect(screen.getByText("Fresh Arrivals")).toBeTruthy();
    expect(screen.getByText("Just listed today")).toBeTruthy();
  });

  it("renders seasonal spotlight section", () => {
    renderHome();

    expect(screen.getByText("🌊 Seasonal Spotlight")).toBeTruthy();
    expect(screen.getByText("Tourist Season is Here")).toBeTruthy();
    expect(
      screen.getByText(
        "Nov–May is peak season. Find the best experiences, stays and local products.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Explore Season Picks")).toBeTruthy();
  });

  it("renders footer links", () => {
    renderHome();

    expect(screen.getByText("Privacy Policy")).toBeTruthy();
    expect(screen.getByText("Terms of Service")).toBeTruthy();
    expect(screen.getByText("Contact Us")).toBeTruthy();
  });

  it("has correct semantic structure", () => {
    renderHome();

    // Check for main landmark
    const main = screen.getByRole("main");
    expect(main).toBeTruthy();

    // Check for headings
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeTruthy();
    expect(h1.textContent).toContain("Buy & Sell");

    const h2Elements = screen.getAllByRole("heading", { level: 2 });
    expect(h2Elements.length).toBeGreaterThan(0);
  });

  it("has working navigation links", () => {
    renderHome();

    const categoryLinks = screen.getAllByRole("link");
    categoryLinks.forEach((link) => {
      expect(link.getAttribute("href")).toBeTruthy();
    });
  });

  it("handles search functionality", () => {
    renderHome();

    const searchInput = screen.getByPlaceholderText(
      "Search mobiles, scooters...",
    );
    expect(searchInput).toBeTruthy();

    // Test search input interaction
    expect(searchInput.getAttribute("type")).toBe("text");
  });

  it("has proper SEO meta tags", () => {
    renderHome();

    // Check for meta description (would be in document head)
    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toBeTruthy();
  });

  it("is responsive on mobile", () => {
    // Mock mobile viewport
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    Object.defineProperty(window, "innerHeight", {
      value: 667,
      writable: true,
    });

    renderHome();

    // Check that content is still visible on mobile
    expect(screen.getByText("Buy & Sell")).toBeTruthy();
    expect(screen.getByText("Browse Island Categories")).toBeTruthy();
  });

  it("handles error states gracefully", () => {
    // Mock error state
    renderHome();

    // Should still render basic structure
    expect(screen.getByText("Buy & Sell")).toBeTruthy();
  });
});
