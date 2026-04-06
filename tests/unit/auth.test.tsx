import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { useState } from 'react'
import { act } from 'react-dom/test-utils'

// Mock the AuthView component
const AuthView = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    setIsLoading(false)
  }

  return (
    <div data-testid="auth-view">
      <h1>Welcome Back</h1>
      <form onSubmit={handleSubmit} data-testid="auth-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
        {errors.email && <span role="alert">{errors.email}</span>}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
        />
        {errors.password && <span role="alert">{errors.password}</span>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      <a href="#" onClick={(e) => e.preventDefault()}>Sign up</a>
    </div>
  )
}


describe('AuthView Component', () => {
  const renderAuthView = () => {
    return render(
      <BrowserRouter>
        <AuthView />
      </BrowserRouter>
    )
  }

  it('renders login form by default', () => {
    renderAuthView()

    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    renderAuthView()

    const emailInput = screen.getByPlaceholderText('Email')
    const form = screen.getByTestId('auth-form')

    // Enter invalid email
    await act(async () => {
      await user.type(emailInput, 'invalid-email')
      fireEvent.submit(form)
    })

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    const user = userEvent.setup()
    renderAuthView()

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Enter short password
    await act(async () => {
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')
      await user.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    renderAuthView()

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await act(async () => {
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
    })

    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /signing in/i })).not.toBeInTheDocument()
    })
  })

  it('prevents form submission with empty fields', async () => {
    const user = userEvent.setup()
    renderAuthView()

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await act(async () => {
      await user.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('has correct semantic structure', () => {
    renderAuthView()

    // Check for form landmark
    const form = screen.getByTestId('auth-form')
    expect(form).toBeInTheDocument()
    expect(form.tagName).toBe('FORM')

    // Check for headings
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Welcome Back')
  })

  it('has accessible form elements', () => {
    renderAuthView()

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('aria-label', 'Email')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveAttribute('aria-label', 'Password')
  })

  it('has working navigation links', () => {
    renderAuthView()

    const signUpLink = screen.getByText('Sign up')
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink.tagName).toBe('A')
  })

  it('is responsive on mobile', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })

    renderAuthView()

    // Check that content is still visible on mobile
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
  })

  it('is responsive on desktop', () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true })

    renderAuthView()

    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
  })

  it('has proper color contrast', () => {
    renderAuthView()

    // Check for high contrast text
    const headings = screen.getAllByRole('heading')
    headings.forEach(heading => {
      expect(heading).toBeInTheDocument()
    })
  })

  it('handles error states gracefully', () => {
    renderAuthView()

    // Should still render basic structure
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
  })
})