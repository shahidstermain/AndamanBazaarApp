import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Profile } from "../src/pages/Profile";
import { auth, db } from "../src/lib/firebase";
import {
  getDoc,
  getDocs,
  doc,
  collection,
  query,
  where,
} from "firebase/firestore";
import { MemoryRouter } from "react-router-dom";

// Note: firebase mocks are handled globally in tests/setup.ts

describe("Profile View", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock user
    (auth as any).currentUser = { uid: "user-123", email: "test@example.com" };

    // Mock getDoc for profile
    vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
      if (docRef.path?.includes("profiles/user-123")) {
        return {
          exists: () => true,
          id: "user-123",
          data: () => ({
            id: "user-123",
            name: "Test User",
            city: "Port Blair",
            area: "Garacharma",
            created_at: { toMillis: () => new Date("2024-01-01").getTime() },
            is_location_verified: true,
            role: "user",
          }),
        } as any;
      }
      return { exists: () => false, data: () => null } as any;
    });

    // Mock getDocs for listings
    vi.mocked(getDocs).mockImplementation(async (q: any) => {
      const path = q?.path || q?.collection?.path || "";
      if (path.includes("listings")) {
        return {
          size: 1,
          empty: false,
          docs: [
            {
              id: "listing-1",
              data: () => ({
                id: "listing-1",
                title: "My Awesome Item",
                price: 500,
                status: "active",
                city: "Port Blair",
                views_count: 5,
                user_id: "user-123",
                created_at: { toMillis: () => Date.now() },
              }),
              exists: () => true,
            },
          ],
          forEach(cb: any) {
            this.docs.forEach(cb);
          },
        } as any;
      }
      return { size: 0, empty: true, docs: [], forEach: () => {} } as any;
    });
  });

  const renderProfile = () => {
    return render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
  };

  it("renders user profile details", async () => {
    renderProfile();

    // Wait for profile data to load
    await waitFor(
      () => {
        expect(screen.getByText("Test User")).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    expect(screen.getByText(/Joined in/i)).toBeInTheDocument();
    // Stats should be visible (Active Ads label + count)
    expect(screen.getByText(/Active Ads/i)).toBeInTheDocument();
  });

  it("renders user listings", async () => {
    renderProfile();

    // Wait for the listing to appear
    await waitFor(
      () => {
        expect(screen.getByText("My Awesome Item")).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    expect(screen.getByText(/₹\s*500/)).toBeInTheDocument();
  });
});
