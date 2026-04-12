import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdaptiveImage } from "../../src/components/AdaptiveImage";

// Mock browser-image-compression (imported transitively by useAdaptiveImages)
vi.mock("browser-image-compression", () => ({
  default: vi
    .fn()
    .mockResolvedValue(new Blob(["compressed"], { type: "image/jpeg" })),
}));

// Mock the hook so we can control the image state directly
vi.mock("../../src/hooks/useAdaptiveImages", () => ({
  useAdaptiveImage: vi.fn(),
  useConnectionSpeed: vi.fn(() => "unknown"),
}));

import { useAdaptiveImage } from "../../src/hooks/useAdaptiveImages";

const mockUseAdaptiveImage = useAdaptiveImage as ReturnType<typeof vi.fn>;

const baseHookReturn = {
  src: "https://example.com/image-thumb.jpg",
  isLoading: false,
  error: false,
  speed: "unknown" as const,
  handleLoad: vi.fn(),
  handleError: vi.fn(),
  upgradeQuality: vi.fn(),
};

describe("AdaptiveImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdaptiveImage.mockReturnValue(baseHookReturn);
  });

  it("renders an img element with the src from the hook", () => {
    render(
      <AdaptiveImage
        fullUrl="https://example.com/image-full.jpg"
        alt="Test image"
      />,
    );
    const img = screen.getByRole("img", { name: "Test image" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/image-thumb.jpg");
  });

  it("shows loading spinner when isLoading is true", () => {
    mockUseAdaptiveImage.mockReturnValue({
      ...baseHookReturn,
      isLoading: true,
    });
    const { container } = render(
      <AdaptiveImage fullUrl="https://example.com/full.jpg" alt="Test" />,
    );
    // Loading state renders a Loader2 spinner with animate-spin
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("shows error fallback when error is true", () => {
    mockUseAdaptiveImage.mockReturnValue({ ...baseHookReturn, error: true });
    render(<AdaptiveImage fullUrl="https://example.com/full.jpg" alt="Test" />);
    expect(screen.getByText("Failed to load image")).toBeInTheDocument();
  });

  it("shows slow-connection badge on 2g", () => {
    mockUseAdaptiveImage.mockReturnValue({
      ...baseHookReturn,
      speed: "2g",
      src: "https://example.com/thumb.jpg",
    });
    render(
      <AdaptiveImage
        fullUrl="https://example.com/full.jpg"
        thumbnailUrl="https://example.com/thumb.jpg"
        alt="Test"
        showUpgradeHint={true}
      />,
    );
    expect(
      screen.getByText("Slow connection - compressed"),
    ).toBeInTheDocument();
  });

  it("calls upgradeQuality when container is clicked (canUpgrade=true)", () => {
    const upgradeQuality = vi.fn();
    mockUseAdaptiveImage.mockReturnValue({
      ...baseHookReturn,
      speed: "2g",
      // src !== fullUrl => canUpgrade = true
      src: "https://example.com/thumb.jpg",
      upgradeQuality,
    });
    const { container } = render(
      <AdaptiveImage
        fullUrl="https://example.com/full.jpg"
        thumbnailUrl="https://example.com/thumb.jpg"
        alt="Test"
        showUpgradeHint={true}
      />,
    );
    // The outer div has onClick={handleClick} which calls upgradeQuality
    fireEvent.click(container.firstChild as HTMLElement);
    expect(upgradeQuality).toHaveBeenCalledOnce();
  });

  it("hides upgrade hint when showUpgradeHint is false", () => {
    mockUseAdaptiveImage.mockReturnValue({
      ...baseHookReturn,
      speed: "2g",
      src: "https://example.com/thumb.jpg",
    });
    render(
      <AdaptiveImage
        fullUrl="https://example.com/full.jpg"
        thumbnailUrl="https://example.com/thumb.jpg"
        alt="Test"
        showUpgradeHint={false}
      />,
    );
    expect(screen.queryByText(/Load full quality/i)).not.toBeInTheDocument();
  });

  it("applies square aspect ratio class", () => {
    const { container } = render(
      <AdaptiveImage
        fullUrl="https://example.com/full.jpg"
        alt="Test"
        aspectRatio="square"
      />,
    );
    expect(container.firstChild).toHaveClass("aspect-square");
  });
});
