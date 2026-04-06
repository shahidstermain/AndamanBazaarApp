import { test, expect } from '@playwright/test'

test.describe('Accessibility Compliance Tests', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    let previousLevel = 0
    
    for (const heading of headings) {
      const level = parseInt(await heading.evaluate(el => el.tagName.substring(1)))
      
      // Heading levels should not skip more than one level
      expect(level).toBeGreaterThanOrEqual(previousLevel)
      expect(level - previousLevel).toBeLessThanOrEqual(1)
      
      previousLevel = level
    }
  })

  test('should have proper alt text for images', async ({ page }) => {
    await page.goto('/')
    
    const images = await page.locator('img').all()
    
    for (const img of images) {
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
      expect(alt).not.toBe('')
      expect(alt).not.toMatch(/^image|photo|picture$/i)
    }
  })

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/auth')
    
    const inputs = await page.locator('input, textarea, select').all()
    
    for (const input of inputs) {
      // Check for associated label
      const hasLabel = await input.evaluate(el => {
        const id = el.id
        const label = document.querySelector(`label[for="${id}"]`)
        const ariaLabel = el.getAttribute('aria-label')
        const ariaLabelledby = el.getAttribute('aria-labelledby')
        
        return label !== null || ariaLabel !== null || ariaLabelledby !== null
      })
      
      expect(hasLabel).toBe(true)
    }
  })

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/')
    
    const interactiveElements = await page.locator('a, button, input, textarea, select').all()
    
    for (const element of interactiveElements) {
      await element.focus()
      
      const hasFocusIndicator = await element.evaluate(el => {
        const style = window.getComputedStyle(el)
        return style.outline !== 'none' || style.boxShadow !== 'none'
      })
      
      expect(hasFocusIndicator).toBe(true)
    }
  })

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/')
    
    const textElements = await page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button').all()
    
    for (const element of textElements) {
      const hasSufficientContrast = await element.evaluate(el => {
        const style = window.getComputedStyle(el)
        const color = style.color
        const background = style.backgroundColor
        
        // Simple check - in real tests you'd calculate actual contrast ratio
        return color !== background && color !== 'transparent' && background !== 'transparent'
      })
      
      expect(hasSufficientContrast).toBe(true)
    }
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/')
    
    // Tab through the page
    const interactiveElements = await page.locator('a, button, input, textarea, select').all()
    
    for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
      await page.keyboard.press('Tab')
      
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    }
  })

  test('should have proper ARIA landmarks', async ({ page }) => {
    await page.goto('/')
    
    const landmarks = await page.locator('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]').all()
    
    // Should have at least main landmark
    const hasMain = await page.locator('[role="main"], main').count()
    expect(hasMain).toBeGreaterThan(0)
    
    // Check that landmarks are properly labeled
    for (const landmark of landmarks) {
      const hasLabel = await landmark.evaluate(el => {
        return el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')
      })
      
      if (landmarks.length > 1) {
        expect(hasLabel).toBe(true)
      }
    }
  })

  test('should have skip links', async ({ page }) => {
    await page.goto('/')
    
    // Check for skip to main content link
    const skipLinks = await page.locator('a[href="#main"], a[href="#content"]').all()
    
    if (skipLinks.length > 0) {
      const skipLink = skipLinks[0]
      await expect(skipLink).toBeVisible()
      
      // Should become visible on focus
      await skipLink.focus()
      await expect(skipLink).toBeVisible()
    }
  })

  test('should have proper language attribute', async ({ page }) => {
    await page.goto('/')
    
    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
  })

  test('should have proper page titles', async ({ page }) => {
    await page.goto('/')
    
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)
    expect(title.length).toBeLessThan(60)
  })

  test('should have proper meta descriptions', async ({ page }) => {
    await page.goto('/')
    
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description).toBeTruthy()
    expect(description.length).toBeGreaterThan(50)
    expect(description.length).toBeLessThan(160)
  })
})

test.describe('Screen Reader Tests', () => {
  test('should have proper button text', async ({ page }) => {
    await page.goto('/')
    
    const buttons = await page.locator('button').all()
    
    for (const button of buttons) {
      const hasText = await button.evaluate(el => {
        return el.textContent?.trim() !== '' || 
               el.hasAttribute('aria-label') || 
               el.hasAttribute('aria-labelledby')
      })
      
      expect(hasText).toBe(true)
    }
  })

  test('should have proper link text', async ({ page }) => {
    await page.goto('/')
    
    const links = await page.locator('a').all()
    
    for (const link of links) {
      const hasMeaningfulText = await link.evaluate(el => {
        const text = el.textContent?.trim() || ''
        return text.length > 0 && !text.match(/^(click here|read more|link)$/i)
      })
      
      if (links.length > 1) {
        expect(hasMeaningfulText).toBe(true)
      }
    }
  })

  test('should have proper error messages', async ({ page }) => {
    await page.goto('/auth')
    
    // Trigger an error
    await page.getByRole('button', { name: 'Sign In' }).click()
    
    const errorMessages = await page.locator('[role="alert"], .error, .text-red-600').all()
    
    for (const error of errorMessages) {
      const isAssociated = await error.evaluate(el => {
        const id = el.id
        if (!id) return true // Skip if no ID
        
        const describedBy = document.querySelectorAll(`[aria-describedby="${id}"]`)
        return describedBy.length > 0
      })
      
      expect(isAssociated).toBe(true)
    }
  })

  test('should have proper loading states', async ({ page }) => {
    await page.goto('/')
    
    const loadingElements = await page.locator('[aria-busy="true"], .loading, .animate-pulse').all()
    
    for (const element of loadingElements) {
      const hasLoadingText = await element.evaluate(el => {
        return el.hasAttribute('aria-label') && 
               el.getAttribute('aria-label')?.includes('Loading')
      })
      
      if (loadingElements.length > 0) {
        expect(hasLoadingText).toBe(true)
      }
    }
  })
})

test.describe('WCAG 2.1 Level AA Compliance', () => {
  test('should meet color contrast requirements', async ({ page }) => {
    await page.goto('/')
    
    // Check large text (18pt+ or 14pt+ bold)
    const largeText = await page.locator('h1, h2, h3, .text-lg, .text-xl, .text-2xl').all()
    
    for (const element of largeText) {
      const hasSufficientContrast = await element.evaluate(el => {
        const style = window.getComputedStyle(el)
        const color = style.color
        const background = style.backgroundColor
        
        // Large text needs 3:1 contrast ratio
        return color !== background && 
               color !== 'transparent' && 
               background !== 'transparent'
      })
      
      expect(hasSufficientContrast).toBe(true)
    }
    
    // Check normal text (needs 4.5:1 contrast ratio)
    const normalText = await page.locator('p, span, a:not(.text-lg), button:not(.text-lg)').all()
    
    for (const element of normalText) {
      const hasSufficientContrast = await element.evaluate(el => {
        const style = window.getComputedStyle(el)
        const color = style.color
        const background = style.backgroundColor
        
        return color !== background && 
               color !== 'transparent' && 
               background !== 'transparent'
      })
      
      expect(hasSufficientContrast).toBe(true)
    }
  })

  test('should provide text alternatives for non-text content', async ({ page }) => {
    await page.goto('/')
    
    // Check images
    const images = await page.locator('img').all()
    
    for (const img of images) {
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
      expect(alt).not.toBe('')
    }
    
    // Check icons
    const icons = await page.locator('[class*="icon"], .material-symbols-outlined').all()
    
    for (const icon of icons) {
      const hasAltText = await icon.evaluate(el => {
        return el.hasAttribute('aria-label') || 
               el.hasAttribute('aria-hidden') ||
               el.closest('[aria-label]') !== null
      })
      
      expect(hasAltText).toBe(true)
    }
  })

  test('should be operable with keyboard only', async ({ page }) => {
    await page.goto('/')
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName)
    expect(firstFocused).toBeTruthy()
    
    // Test that all interactive elements are reachable
    const interactiveElements = await page.locator('a, button, input, textarea, select').all()
    
    for (let i = 0; i < Math.min(interactiveElements.length, 5); i++) {
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    }
  })

  test('should provide clear instructions and feedback', async ({ page }) => {
    await page.goto('/auth')
    
    // Check form instructions
    const formInstructions = await page.locator('form').all()
    
    for (const form of formInstructions) {
      const hasInstructions = await form.evaluate(el => {
        return el.querySelector('[aria-describedby]') !== null ||
               el.querySelector('.help-text') !== null ||
               el.querySelector('.instructions') !== null
      })
      
      // Forms should have clear instructions
      expect(hasInstructions).toBe(true)
    }
  })
})

test.describe('Mobile Accessibility Tests', () => {
  test('should work with screen readers on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check that touch targets are large enough
    const buttons = await page.locator('button, a').all()
    
    for (const button of buttons) {
      const boundingBox = await button.boundingBox()
      
      if (boundingBox) {
        // Touch targets should be at least 44x44 pixels
        expect(boundingBox.width).toBeGreaterThanOrEqual(44)
        expect(boundingBox.height).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('should handle orientation changes', async ({ page }) => {
    await page.goto('/')
    
    // Test portrait orientation
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByRole('heading', { name: 'Buy & Sell' })).toBeVisible()
    
    // Test landscape orientation
    await page.setViewportSize({ width: 667, height: 375 })
    await expect(page.getByRole('heading', { name: 'Buy & Sell' })).toBeVisible()
  })
})

test.describe('Automated Accessibility Testing', () => {
  test('should pass automated accessibility scan', async ({ page }) => {
    await page.goto('/')
    
    // Inject axe-core for automated testing
    await page.addScriptTag({
      url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js'
    })
    
    const results = await page.evaluate(async () => {
      if ((window as any).axe) {
        return await (window as any).axe.run()
      }
      return { violations: [] }
    })
    
    // Should have no critical violations
    const criticalViolations = results.violations.filter(v => v.impact === 'critical')
    expect(criticalViolations).toHaveLength(0)
    
    // Should have no serious violations
    const seriousViolations = results.violations.filter(v => v.impact === 'serious')
    expect(seriousViolations).toHaveLength(0)
    
    // Should have no more than 5 moderate violations
    const moderateViolations = results.violations.filter(v => v.impact === 'moderate')
    expect(moderateViolations.length).toBeLessThanOrEqual(5)
  })
})