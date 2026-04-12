import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ListingDetail } from "../src/pages/ListingDetail";
import { supabase } from "../src/lib/supabase";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { createMockChain } from "./setup";
import { ToastProvider } from "../src/components/Toast";

vi.mock("../src/lib/supabase");

describe("ListingDetail View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  const renderListingDetail = (id: string = "listing-1") => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={[`/listings/${id}`]}>
          <Routes>
            <Route path="/listings/:id" element={<ListingDetail />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
  };

  it("renders listing details and fetches images and seller sequentially", async () => {
    const mockListing = {
      id: "listing-1",
      title: "Beach House",
      price: 5000,
      user_id: "seller-456",
      description: "Beautiful house near the beach",
      city: "Port Blair",
      status: "active",
    };

    const mockImages = [
      { id: "img-1", image_url: "house.jpg", listing_id: "listing-1" },
    ];

    const mockSeller = {
      id: "seller-456",
      name: "John Doe",
      profile_photo_url: null,
    };

    const fromSpy = vi.spyOn(supabase, "from");

    fromSpy.mockImplementation((table: string) => {
      if (table === "listings") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: mockListing, error: null }),
          then: (cb: any) => cb({ data: mockListing, error: null }),
        } as any;
      }
      if (table === "listing_images") {
        return createMockChain(mockImages);
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSeller, error: null }),
          then: (cb: any) => cb({ data: mockSeller, error: null }),
        } as any;
      }
      return createMockChain([]);
    });

    renderListingDetail("listing-1");

    await waitFor(() => {
      expect(screen.getByText("Beach House")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    expect(fromSpy).toHaveBeenCalledWith("listings");
    expect(fromSpy).toHaveBeenCalledWith("listing_images");
    expect(fromSpy).toHaveBeenCalledWith("profiles");
  });

  it("shows missing message when listing not found", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "listings") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          then: (cb: any) => cb({ data: null, error: null }),
        };
      }
      return createMockChain([]);
    });

    renderListingDetail("invalid-id");

    await waitFor(() => {
      expect(screen.getByText(/Item Not Found/i)).toBeInTheDocument();
    });
  });
});
