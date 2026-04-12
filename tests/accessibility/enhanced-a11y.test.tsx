/**
 * Enhanced Accessibility Testing Suite
 * Comprehensive WCAG 2.1 AA compliance testing
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import userEvent from "@testing-library/user-event";

// Extend expect with axe matchers
expect.extend(toHaveNoViolations);

// Accessibility testing utilities
export const A11yUtils = {
  // Check color contrast
  checkColorContrast: (element: HTMLElement) => {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;

    // Convert RGB to hex
    const rgbToHex = (rgb: string) => {
      const values = rgb.match(/\d+/g);
      if (!values) return "#000000";

      const hex = values
        .slice(0, 3)
        .map((x) => {
          const hex = parseInt(x).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("");

      return "#" + hex;
    };

    // Calculate contrast ratio
    const getLuminance = (hex: string) => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = rgb & 0xff;

      const [rs, gs, bs] = [r, g, b].map((c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const getContrastRatio = (color1: string, color2: string) => {
      const lum1 = getLuminance(color1);
      const lum2 = getLuminance(color2);

      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);

      return (brightest + 0.05) / (darkest + 0.05);
    };

    const foregroundColor = rgbToHex(color);
    const bgColor = rgbToHex(backgroundColor);

    return {
      ratio: getContrastRatio(foregroundColor, bgColor),
      foregroundColor,
      backgroundColor,
      passesWCAGAA: getContrastRatio(foregroundColor, bgColor) >= 4.5,
      passesWCAGAAA: getContrastRatio(foregroundColor, bgColor) >= 7,
    };
  },

  // Check focus management
  checkFocusManagement: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const issues: string[] = [];

    focusableElements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;

      // Check if element is focusable
      if (htmlElement.tabIndex < 0) {
        issues.push(`Element ${index} has negative tabindex`);
      }

      // Check if element has visible focus indicator
      const styles = window.getComputedStyle(htmlElement, ":focus");
      if (styles.outline === "none" && styles.boxShadow === "none") {
        issues.push(`Element ${index} lacks visible focus indicator`);
      }
    });

    return {
      focusableElementCount: focusableElements.length,
      issues,
      hasIssues: issues.length > 0,
    };
  },

  // Check semantic structure
  checkSemanticStructure: (container: HTMLElement) => {
    const headingLevels = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const landmarks = container.querySelectorAll(
      "main, nav, header, footer, section, article, aside",
    );
    const lists = container.querySelectorAll("ul, ol, dl");

    const issues: string[] = [];

    // Check heading hierarchy
    let previousLevel = 0;
    headingLevels.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      if (previousLevel > 0 && level > previousLevel + 1) {
        issues.push(`Heading level skipped: h${previousLevel} to h${level}`);
      }
      previousLevel = level;
    });

    // Check for proper landmarks
    if (landmarks.length === 0) {
      issues.push("No semantic landmarks found");
    }

    // Check if lists have proper structure
    lists.forEach((list) => {
      if (list.querySelectorAll("li").length === 0) {
        issues.push("List element without list items");
      }
    });

    return {
      headingCount: headingLevels.length,
      landmarkCount: landmarks.length,
      listCount: lists.length,
      issues,
      hasIssues: issues.length > 0,
    };
  },

  // Check screen reader compatibility
  checkScreenReaderCompatibility: (container: HTMLElement) => {
    const images = container.querySelectorAll("img");
    const inputs = container.querySelectorAll("input, textarea, select");
    const buttons = container.querySelectorAll("button");

    const issues: string[] = [];

    // Check images have alt text
    images.forEach((img) => {
      if (!img.getAttribute("alt") && img.getAttribute("alt") !== "") {
        issues.push("Image missing alt attribute");
      }
    });

    // Check form controls have labels
    inputs.forEach((input) => {
      const id = input.getAttribute("id");
      const hasLabel = id
        ? container.querySelector(`label[for="${id}"]`)
        : false;
      const hasAriaLabel =
        input.getAttribute("aria-label") ||
        input.getAttribute("aria-labelledby");

      if (!hasLabel && !hasAriaLabel) {
        issues.push("Form control missing label");
      }
    });

    // Check buttons have accessible names
    buttons.forEach((button) => {
      const hasText = button.textContent?.trim().length > 0;
      const hasAriaLabel = button.getAttribute("aria-label");
      const hasAriaLabelledBy = button.getAttribute("aria-labelledby");

      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push("Button missing accessible name");
      }
    });

    return {
      imageCount: images.length,
      inputCount: inputs.length,
      buttonCount: buttons.length,
      issues,
      hasIssues: issues.length > 0,
    };
  },

  // Check keyboard navigation
  checkKeyboardNavigation: async (container: HTMLElement) => {
    const focusableElements = Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ) as HTMLElement[];

    const issues: string[] = [];

    // Test Tab navigation
    for (let i = 0; i < focusableElements.length; i++) {
      const element = focusableElements[i];

      // Focus element
      element.focus();

      // Check if element actually received focus
      if (document.activeElement !== element) {
        issues.push(`Element ${i} cannot receive focus`);
      }

      // Check if element is visible when focused
      const rect = element.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;

      if (!isVisible) {
        issues.push(`Element ${i} is not visible when focused`);
      }
    }

    return {
      focusableElementCount: focusableElements.length,
      issues,
      hasIssues: issues.length > 0,
    };
  },
};

describe("Enhanced Accessibility Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("WCAG 2.1 AA Compliance", () => {
    it("should pass axe accessibility testing", async () => {
      const TestComponent = () => (
        <main>
          <h1>Product Listings</h1>
          <section aria-labelledby="filters-heading">
            <h2 id="filters-heading">Filters</h2>
            <form role="search">
              <label htmlFor="search-input">Search products</label>
              <input id="search-input" type="search" placeholder="Search..." />
              <button type="submit">Search</button>
            </form>
          </section>
          <section aria-labelledby="results-heading">
            <h2 id="results-heading">Results</h2>
            <ul role="list">
              <li>
                <article>
                  <h3>Product 1</h3>
                  <p>Description of product 1</p>
                  <button aria-label="Add Product 1 to cart">
                    Add to cart
                  </button>
                </article>
              </li>
            </ul>
          </section>
        </main>
      );

      const { container } = render(<TestComponent />);
      const results = await axe(container);

      expect(results).toHaveNoViolations();
    });

    it("should maintain proper heading hierarchy", () => {
      const TestComponent = () => (
        <div>
          <h1>Main Title</h1>
          <h2>Section 1</h2>
          <h3>Subsection 1.1</h3>
          <h4>Sub-subsection 1.1.1</h4>
          <h2>Section 2</h2>
          <h3>Subsection 2.1</h3>
        </div>
      );

      const { container } = render(<TestComponent />);
      const structure = A11yUtils.checkSemanticStructure(container);

      expect(structure.hasIssues).toBe(false);
      expect(structure.headingCount).toBe(6);
    });

    it("should detect heading level violations", () => {
      const TestComponent = () => (
        <div>
          <h1>Main Title</h1>
          <h3>Skipped h2 level</h3>
          <h2>Back to h2</h2>
        </div>
      );

      const { container } = render(<TestComponent />);
      const structure = A11yUtils.checkSemanticStructure(container);

      expect(structure.hasIssues).toBe(true);
      expect(structure.issues).toContain("Heading level skipped: h1 to h3");
    });
  });

  describe("Color Contrast and Visual Accessibility", () => {
    it("should ensure sufficient color contrast for text", () => {
      const TestComponent = () => (
        <div>
          <p style={{ color: "#000000", backgroundColor: "#FFFFFF" }}>
            High contrast text (should pass)
          </p>
          <p style={{ color: "#666666", backgroundColor: "#FFFFFF" }}>
            Medium contrast text (should pass)
          </p>
          <p style={{ color: "#CCCCCC", backgroundColor: "#FFFFFF" }}>
            Low contrast text (should fail)
          </p>
        </div>
      );

      const { container } = render(<TestComponent />);
      const paragraphs = container.querySelectorAll("p");

      const highContrast = A11yUtils.checkColorContrast(paragraphs[0]);
      const mediumContrast = A11yUtils.checkColorContrast(paragraphs[1]);
      const lowContrast = A11yUtils.checkColorContrast(paragraphs[2]);

      expect(highContrast.passesWCAGAA).toBe(true);
      expect(mediumContrast.passesWCAGAA).toBe(true);
      expect(lowContrast.passesWCAGAA).toBe(false);
    });

    it("should provide focus indicators for interactive elements", () => {
      const TestComponent = () => (
        <div>
          <button>Normal Button</button>
          <button style={{ outline: "none" }}>No Outline Button</button>
          <button style={{ outline: "2px solid blue" }}>
            Custom Focus Button
          </button>
        </div>
      );

      const { container } = render(<TestComponent />);
      const focusManagement = A11yUtils.checkFocusManagement(container);

      expect(focusManagement.focusableElementCount).toBe(3);
      // Should detect focus indicator issues
      expect(focusManagement.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Screen Reader Compatibility", () => {
    it("should provide proper alt text for images", () => {
      const TestComponent = () => (
        <div>
          <img src="product1.jpg" alt="A red bicycle with white tires" />
          <img src="logo.png" alt="Company Logo" />
          <img src="decorative.jpg" alt="" role="presentation" />
          <img src="missing-alt.jpg" />
        </div>
      );

      const { container } = render(<TestComponent />);
      const screenReader = A11yUtils.checkScreenReaderCompatibility(container);

      expect(screenReader.imageCount).toBe(4);
      expect(screenReader.hasIssues).toBe(true);
      expect(screenReader.issues).toContain("Image missing alt attribute");
    });

    it("should associate labels with form controls", () => {
      const TestComponent = () => (
        <form>
          <label htmlFor="email">Email Address</label>
          <input id="email" type="email" />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" />

          <input type="text" placeholder="Unlabeled input" />

          <button aria-label="Submit form">Submit</button>
          <button>Button without accessible name</button>
        </form>
      );

      const { container } = render(<TestComponent />);
      const screenReader = A11yUtils.checkScreenReaderCompatibility(container);

      expect(screenReader.inputCount).toBe(3);
      expect(screenReader.buttonCount).toBe(2);
      expect(screenReader.hasIssues).toBe(true);
      expect(screenReader.issues).toContain("Form control missing label");
      expect(screenReader.issues).toContain("Button missing accessible name");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should support full keyboard navigation", async () => {
      const TestComponent = () => (
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
          <input type="text" placeholder="Text input" />
          <select>
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
          <a href="/link">Link</a>
        </div>
      );

      const { container } = render(<TestComponent />);
      const keyboardNav = await A11yUtils.checkKeyboardNavigation(container);

      expect(keyboardNav.focusableElementCount).toBe(5);
      expect(keyboardNav.hasIssues).toBe(false);
    });

    it("should handle tab order correctly", async () => {
      const user = userEvent.setup();

      const TestComponent = () => (
        <div>
          <button>First</button>
          <button tabIndex={3}>Third (tabindex 3)</button>
          <button tabIndex={1}>Second (tabindex 1)</button>
          <button tabIndex={2}>Fourth (tabindex 2)</button>
        </div>
      );

      const { container } = render(<TestComponent />);

      // Test tab order
      await user.tab();
      expect(document.activeElement).toBe(container.querySelector("button"));

      await user.tab();
      expect(document.activeElement?.textContent).toBe("Second (tabindex 1)");

      await user.tab();
      expect(document.activeElement?.textContent).toBe("Fourth (tabindex 2)");

      await user.tab();
      expect(document.activeElement?.textContent).toBe("Third (tabindex 3)");
    });
  });

  describe("ARIA Attributes and Roles", () => {
    it("should use ARIA attributes correctly", () => {
      const TestComponent = () => (
        <div>
          <button aria-expanded="false" aria-controls="menu">
            Menu
          </button>
          <ul id="menu" role="menu" aria-hidden="true">
            <li role="menuitem">Item 1</li>
            <li role="menuitem">Item 2</li>
          </ul>

          <div role="alert" aria-live="polite">
            Important message
          </div>

          <input
            type="search"
            aria-label="Search products"
            aria-describedby="search-help"
          />
          <div id="search-help">Enter keywords to search</div>
        </div>
      );

      const { container } = render(<TestComponent />);

      // Check ARIA attributes are present
      expect(container.querySelector("[aria-expanded]")).toBeInTheDocument();
      expect(container.querySelector("[aria-controls]")).toBeInTheDocument();
      expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
      expect(container.querySelector("[aria-live]")).toBeInTheDocument();
      expect(container.querySelector("[aria-label]")).toBeInTheDocument();
      expect(container.querySelector("[aria-describedby]")).toBeInTheDocument();
    });

    it("should validate ARIA state consistency", async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [isOpen, setIsOpen] = React.useState(false);

        return (
          <div>
            <button
              aria-expanded={isOpen}
              aria-controls="dropdown"
              onClick={() => setIsOpen(!isOpen)}
            >
              Toggle Menu
            </button>
            <ul
              id="dropdown"
              role="menu"
              aria-hidden={!isOpen}
              style={{ display: isOpen ? "block" : "none" }}
            >
              <li>Menu Item 1</li>
              <li>Menu Item 2</li>
            </ul>
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      const button = container.querySelector("button");
      const menu = container.querySelector("#dropdown");

      // Initial state
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(menu).toHaveAttribute("aria-hidden", "true");

      // Toggle open
      await user.click(button!);
      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(menu).toHaveAttribute("aria-hidden", "false");

      // Toggle close
      await user.click(button!);
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(menu).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Responsive Design Accessibility", () => {
    it("should maintain accessibility on mobile devices", () => {
      // Simulate mobile viewport
      Object.defineProperty(window, "innerWidth", {
        value: 375,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 667,
        writable: true,
      });

      const TestComponent = () => (
        <div>
          <h1>Mobile Title</h1>
          <button>Mobile Button</button>
          <input type="text" placeholder="Mobile input" />
        </div>
      );

      const { container } = render(<TestComponent />);

      // Check touch target sizes (minimum 44x44 points)
      const button = container.querySelector("button");
      const buttonStyles = window.getComputedStyle(button!);
      const buttonWidth = parseInt(buttonStyles.width);
      const buttonHeight = parseInt(buttonStyles.height);

      expect(buttonWidth).toBeGreaterThanOrEqual(44);
      expect(buttonHeight).toBeGreaterThanOrEqual(44);
    });

    it("should handle orientation changes gracefully", () => {
      // Simulate orientation change
      const TestComponent = () => (
        <div>
          <header>
            <h1>Responsive Header</h1>
            <nav>
              <button>Menu</button>
            </nav>
          </header>
          <main>
            <p>Content that adapts to orientation</p>
          </main>
        </div>
      );

      const { container } = render(<TestComponent />);

      // Test landscape orientation
      Object.defineProperty(window, "innerWidth", {
        value: 1024,
        writable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 768,
        writable: true,
      });

      // Trigger resize event
      window.dispatchEvent(new Event("resize"));

      // Should still be accessible
      expect(container.querySelector("h1")).toBeInTheDocument();
      expect(container.querySelector("button")).toBeInTheDocument();
    });
  });
});
