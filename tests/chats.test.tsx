import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ChatList } from "../src/pages/ChatList";
import { supabase } from "../src/lib/supabase";

vi.mock("../src/lib/supabase");
import { MemoryRouter } from "react-router-dom";
import { createMockChain } from "./setup";

describe("ChatList View", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock user
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  const renderChatList = () => {
    render(
      <MemoryRouter>
        <ChatList />
      </MemoryRouter>,
    );
  };

  it('renders "No messages yet" when inbox is empty', async () => {
    vi.spyOn(supabase, "from").mockImplementation(() => createMockChain([]));

    renderChatList();

    await waitFor(() => {
      expect(screen.getByText(/No active chats yet/i)).toBeInTheDocument();
    });
  });

  it("renders a list of active chats and fetches related data sequentially", async () => {
    const mockChats = [
      {
        id: "chat-1",
        listing_id: "listing-1",
        buyer_id: "user-123",
        seller_id: "seller-456",
        last_message: "Is it available?",
        last_message_at: new Date().toISOString(),
        buyer_unread_count: 1,
        seller_unread_count: 0,
      },
    ];

    const mockListings = [{ id: "listing-1", title: "Beach House" }];
    const mockProfiles = [
      { id: "seller-456", name: "John Doe", profile_photo_url: null },
      { id: "user-123", name: "Me", profile_photo_url: null },
    ];

    const fromSpy = vi.spyOn(supabase, "from");

    fromSpy.mockImplementation((table: string) => {
      if (table === "chats") return createMockChain(mockChats) as any;
      if (table === "listings") return createMockChain(mockListings) as any;
      if (table === "profiles") return createMockChain(mockProfiles) as any;
      return createMockChain([]) as any;
    });

    renderChatList();

    await waitFor(() => {
      expect(screen.getByText("Beach House")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Is it available?")).toBeInTheDocument();
    });

    // Verify sequential calls
    expect(fromSpy).toHaveBeenCalledWith("chats");
    expect(fromSpy).toHaveBeenCalledWith("listings");
    expect(fromSpy).toHaveBeenCalledWith("profiles");
  });
});
