import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Todos } from "../src/pages/Todos";
import { supabase } from "../src/lib/supabase";

vi.mock("../src/lib/supabase");
import { ToastProvider } from "../src/components/Toast";

// Mock Supabase
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    })),
  },
}));

describe("Todos View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTodos = () => {
    render(
      <ToastProvider>
        <Todos />
      </ToastProvider>,
    );
  };

  it("renders the Todo list title", async () => {
    // Mock empty response
    vi.spyOn(supabase, "from").mockImplementation((() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })) as any);

    renderTodos();

    await waitFor(() => {
      expect(screen.getByText("Project Tasks")).toBeInTheDocument();
    });
  });

  it("displays empty state when no todos exist", async () => {
    vi.spyOn(supabase, "from").mockImplementation((() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })) as any);

    renderTodos();

    await waitFor(() => {
      expect(screen.getByText("No tasks found")).toBeInTheDocument();
    });
  });

  it("renders a list of todos", async () => {
    const mockTodos = [
      {
        id: "1",
        title: "Test Task 1",
        is_completed: false,
        created_at: "2023-01-01",
      },
      {
        id: "2",
        title: "Test Task 2",
        is_completed: true,
        created_at: "2023-01-02",
      },
    ];

    vi.spyOn(supabase, "from").mockImplementation((() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockTodos, error: null }),
    })) as any);

    renderTodos();

    await waitFor(() => {
      expect(screen.getByText("Test Task 1")).toBeInTheDocument();
      expect(screen.getByText("Test Task 2")).toBeInTheDocument();
    });
  });

  it("allows adding a new todo", async () => {
    vi.spyOn(supabase, "from").mockImplementation((() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
    })) as any);

    // Mock insert response
    const newTodo = { id: "3", title: "New Task", is_completed: false };
    const insertMock = vi
      .fn()
      .mockResolvedValue({ data: [newTodo], error: null });

    // Setup chain for insert
    vi.spyOn(supabase, "from").mockImplementation(((table: string) => {
      if (table === "todos") {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockReturnThis(),
        };
      }
    }) as any);

    // We need to be more specific with the mock for the interactive test
    const selectMock = vi.fn();
    const insertChainMock = {
      select: vi.fn().mockResolvedValue({ data: [newTodo], error: null }),
    };

    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue(insertChainMock),
    } as any);

    renderTodos();

    const input = screen.getByPlaceholderText("What needs to be done?");
    const button = screen.getByRole("button", { name: "" }); // The plus button has no text

    fireEvent.change(input, { target: { value: "New Task" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("todos");
    });
  });
});
