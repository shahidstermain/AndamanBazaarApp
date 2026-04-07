# 🤝 Contributing to AndamanBazaar

Guide for contributing to the AndamanBazaar marketplace platform.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Commit Convention](#commit-convention)
- [Issue Reporting](#issue-reporting)
- [Community Guidelines](#community-guidelines)

---

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed
- **Git** configured with your name and email
- **GitHub account** with 2FA enabled
- **Supabase account** (for local development)
- **Code editor** (VS Code recommended)

### First Steps

1. **Fork the repository**

   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/AndamanBazaarApp.git
   cd AndamanBazaarApp
   ```

2. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/shahidster1711/AndamanBazaarApp.git
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Set up environment**

   ```bash
   cp .env.example .env
   # Fill in your Supabase credentials
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

---

## ⚙️ Development Setup

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database Setup

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Seed database (optional)
supabase db seed

# Stop local Supabase
supabase stop
```

### VS Code Configuration

Recommended VS Code extensions:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

VS Code settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

---

## 📝 Code Standards

### TypeScript Guidelines

#### 1. Type Safety

```typescript
// ✅ Good - Explicit types
interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User | null> => {
  // Implementation
};

// ❌ Bad - Implicit any
const getUser = async (id) => {
  // Implementation
};
```

#### 2. Error Handling

```typescript
// ✅ Good - Proper error handling
const fetchListing = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to fetch listing:', error);
    showToast('Failed to load listing', 'error');
    throw error;
  }
};

// ❌ Bad - No error handling
const fetchListing = async (id: string) => {
  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single();
  return data;
};
```

#### 3. Component Structure

```typescript
// ✅ Good - Well-structured component
interface ListingCardProps {
  listing: Listing;
  onFavorite?: (id: string) => void;
  className?: string;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onFavorite,
  className = ''
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  
  const handleFavorite = useCallback(() => {
    setIsFavorited(!isFavorited);
    onFavorite?.(listing.id);
  }, [isFavorited, listing.id, onFavorite]);

  return (
    <div className={`listing-card ${className}`}>
      {/* Component JSX */}
    </div>
  );
};

// ❌ Bad - Poor structure
export default function ListingCard({ listing, onFavorite }) {
  const [isFavorited, setIsFavorited] = useState(false);
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### React Best Practices

#### 1. Hooks Usage

```typescript
// ✅ Good - Proper hook usage
const useListing = (id: string) => {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        const data = await listingService.getById(id);
        setListing(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  return { listing, loading, error };
};

// ❌ Bad - Incorrect hook usage
const useListing = (id: string) => {
  const [listing, setListing] = useState(null);
  
  // Don't use async directly in useEffect
  useEffect(async () => {
    const data = await listingService.getById(id);
    setListing(data);
  }, [id]);
  
  return listing;
};
```

#### 2. Performance

```typescript
// ✅ Good - Optimized component
const ExpensiveComponent = React.memo<Props>(({ data, onAction }) => {
  const memoizedValue = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);

  const handleAction = useCallback(() => {
    onAction(memoizedValue);
  }, [memoizedValue, onAction]);

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
});

// ❌ Bad - Unoptimized component
const ExpensiveComponent = ({ data, onAction }) => {
  const value = expensiveCalculation(data); // Recalculates every render
  
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

### CSS/Style Guidelines

#### 1. Tailwind CSS Usage

```typescript
// ✅ Good - Organized classes
<div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">

// ❌ Bad - Unorganized classes
<div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
```

#### 2. Responsive Design

```typescript
// ✅ Good - Mobile-first approach
<div className="w-full px-4 py-2 md:w-auto md:px-6 md:py-3 lg:px-8 lg:py-4">

// ❌ Bad - Desktop-first approach
<div className="w-auto px-8 py-4 md:w-full md:px-4 md:py-2">
```

### File Naming Conventions

```
# Components
PascalCase.tsx (e.g., ListingCard.tsx, TrustBadge.tsx)

# Hooks
camelCase.ts (e.g., useAuth.ts, useListings.ts)

# Utilities
camelCase.ts (e.g., validation.ts, formatting.ts)

# Types
camelCase.ts (e.g., userTypes.ts, apiTypes.ts)

# Constants
UPPER_SNAKE_CASE.ts (e.g., API_ENDPOINTS.ts, ERROR_MESSAGES.ts)
```

---

## 🧪 Testing Guidelines

### Unit Testing

```typescript
// ✅ Good - Comprehensive test
describe('ListingCard', () => {
  const mockListing: Listing = {
    id: '1',
    title: 'Test Listing',
    price: 100,
    user: { id: '1', name: 'Test User' }
  };

  it('renders listing information correctly', () => {
    render(<ListingCard listing={mockListing} />);
    
    expect(screen.getByText('Test Listing')).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
  });

  it('calls onFavorite when favorite button is clicked', () => {
    const onFavorite = vi.fn();
    render(<ListingCard listing={mockListing} onFavorite={onFavorite} />);
    
    fireEvent.click(screen.getByRole('button', { name: /favorite/i }));
    
    expect(onFavorite).toHaveBeenCalledWith('1');
  });

  it('handles loading state', () => {
    render(<ListingCard listing={null} loading={true} />);
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });
});
```

### Integration Testing

```typescript
// ✅ Good - Integration test
describe('Listing Creation Flow', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('creates listing successfully', async () => {
    const user = await createTestUser();
    
    render(<CreateListing />, { wrapper: AuthProvider });
    
    // Fill form
    await userEvent.type(screen.getByLabelText(/title/i), 'Test Listing');
    await userEvent.type(screen.getByLabelText(/price/i), '100');
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: /create listing/i }));
    
    // Verify
    await waitFor(() => {
      expect(screen.getByText(/listing created successfully/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Testing

```typescript
// ✅ Good - E2E test
test('user can browse and contact seller', async ({ page }) => {
  await page.goto('/');
  
  // Browse listings
  await page.click('[data-testid="listing-card"]:first-child');
  
  // Verify listing details
  await expect(page.locator('h1')).toContainText('Listing Details');
  
  // Contact seller
  await page.click('[data-testid="contact-seller"]');
  await page.fill('[data-testid="message-input"]', 'Is this item available?');
  await page.click('[data-testid="send-message"]');
  
  // Verify message sent
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
});
```

---

## 🔄 Pull Request Process

### 1. Create Feature Branch

```bash
# Sync with main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/bug-description

# For hotfixes
git checkout -b hotfix/urgent-fix
```

### 2. Make Changes

- Follow code standards
- Add tests for new functionality
- Update documentation
- Keep commits atomic

### 3. Test Your Changes

```bash
# Run all tests
npm run test:all

# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

### 4. Submit Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create PR on GitHub
# Include:
# - Clear description
# - Testing steps
# - Screenshots (if UI changes)
# - Related issues
```

### PR Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No console errors
- [ ] Mobile responsive

## Related Issues
Closes #123
```

---

## 📝 Commit Convention

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Build process, dependency updates

### Examples

```bash
# Good commits
feat(listings): add similar listings section
fix(auth): resolve JWT token expiration issue
docs(readme): update installation instructions
test(chat): add message sending integration tests
refactor(components): extract shared button component

# Bad commits
fix bug
add stuff
update
wip
```

### Detailed Example

```bash
feat(listings): add similar listings recommendation

- Implement category-based similarity matching
- Add "You might also like" section
- Include loading states and error handling
- Update listing detail page layout

Closes #123
```

---

## 🐛 Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
Clear and concise description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots**
Add screenshots if applicable.

**Environment**
- OS: [e.g. iOS, Android, Windows, macOS]
- Browser: [e.g. Chrome, Safari, Firefox]
- Version: [e.g. 1.0.0]

**Additional Context**
Add any other context about the problem.
```

### Feature Requests

Use the feature request template:

```markdown
**Feature Description**
Clear and concise description of the feature.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How you envision this feature working.

**Alternatives Considered**
Other solutions you've thought about.

**Additional Context**
Add any other context or screenshots.
```

---

## 👥 Community Guidelines

### Code of Conduct

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome contributors of all backgrounds
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Understand that everyone has different experience levels

### Communication

- **GitHub Discussions**: Use for general questions and ideas
- **Issues**: Use for bug reports and feature requests
- **Pull Requests**: Use for code contributions
- **Discord/Slack**: For real-time collaboration (if available)

### Getting Help

1. **Search existing issues** before creating new ones
2. **Ask questions** in GitHub Discussions
3. **Join community calls** (if scheduled)
4. **Mentorship**: Ask for help from maintainers

---

## 🏆 Recognition

### Contributors

All contributors are recognized in:

- `README.md` - Contributors section
- `CONTRIBUTORS.md` - Detailed contributor list
- GitHub contributors graph
- Release notes

### Types of Contributions

- **Code**: Features, fixes, tests
- **Documentation**: Guides, API docs, tutorials
- **Design**: UI/UX improvements, graphics
- **Community**: Support, feedback, ideas
- **Infrastructure**: CI/CD, deployment, tools

---

## 📚 Resources

### Documentation

- [Project README](./README.md)
- [API Documentation](./API.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)

### Tools

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Learning Resources

- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-testing-mistakes)

---

## 🎯 Quick Start Checklist

For new contributors, follow this checklist:

- [ ] Fork the repository
- [ ] Set up local development environment
- [ ] Read the code standards
- [ ] Find an issue to work on
- [ ] Create a feature branch
- [ ] Make your changes
- [ ] Add tests
- [ ] Update documentation
- [ ] Submit a pull request
- [ ] Respond to feedback

---

## 📞 Contact

- **Maintainers**: @shahidster1711
- **Email**: support@andamanbazaar.in
- **Discussions**: [GitHub Discussions](https://github.com/shahidster1711/AndamanBazaarApp/discussions)

---

Thank you for contributing to AndamanBazaar! 🎉

*Last updated: March 7, 2026*
