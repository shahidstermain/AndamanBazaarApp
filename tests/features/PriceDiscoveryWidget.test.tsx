import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PriceDiscoveryWidget, type PriceSuggestion } from '../../src/components/PriceDiscoveryWidget';

const mockSuggestion: PriceSuggestion = {
  avg_price: 15000,
  min_price: 8000,
  max_price: 22000,
  listing_count: 18,
  confidence: 'high',
  days_to_sell_avg: 5,
  price_distribution: [
    { range: '₹8000 - ₹11000', count: 4 },
    { range: '₹11000 - ₹15000', count: 6 },
    { range: '₹15000 - ₹18000', count: 5 },
    { range: '₹18000 - ₹22000', count: 3 },
  ],
  ai_analysis: 'Based on 18 similar listings, consider pricing at ₹15,000 for a quick sale.',
};

describe('PriceDiscoveryWidget', () => {
  it('shows loading spinner when loading prop is true', () => {
    render(
      <PriceDiscoveryWidget
        suggestion={null}
        currentPrice=""
        onApplySuggestion={vi.fn()}
        loading={true}
      />
    );
    expect(screen.getByText('Analyzing market data...')).toBeInTheDocument();
  });

  it('shows empty state when suggestion is null and not loading', () => {
    render(
      <PriceDiscoveryWidget
        suggestion={null}
        currentPrice=""
        onApplySuggestion={vi.fn()}
        loading={false}
      />
    );
    expect(screen.getByText(/Not enough similar listings/)).toBeInTheDocument();
  });

  it('shows empty state when listing_count is 0', () => {
    const emptySuggestion = { ...mockSuggestion, listing_count: 0 };
    render(
      <PriceDiscoveryWidget
        suggestion={emptySuggestion}
        currentPrice=""
        onApplySuggestion={vi.fn()}
      />
    );
    expect(screen.getByText(/Not enough similar listings/)).toBeInTheDocument();
  });

  it('renders average price, range, and days to sell', () => {
    render(
      <PriceDiscoveryWidget
        suggestion={mockSuggestion}
        currentPrice=""
        onApplySuggestion={vi.fn()}
      />
    );
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
    expect(screen.getByText('5d')).toBeInTheDocument();
    expect(screen.getByText('high confidence')).toBeInTheDocument();
  });

  it('renders AI analysis text', () => {
    render(
      <PriceDiscoveryWidget
        suggestion={mockSuggestion}
        currentPrice=""
        onApplySuggestion={vi.fn()}
      />
    );
    expect(screen.getByText(/consider pricing at/i)).toBeInTheDocument();
  });

  it('calls onApplySuggestion with avg_price when button clicked', () => {
    const onApply = vi.fn();
    render(
      <PriceDiscoveryWidget
        suggestion={mockSuggestion}
        currentPrice="20000"
        onApplySuggestion={onApply}
      />
    );
    fireEvent.click(screen.getByText(/Use Suggested Price/));
    expect(onApply).toHaveBeenCalledWith(15000);
  });

  it('does not show apply button when currentPrice already matches avg', () => {
    render(
      <PriceDiscoveryWidget
        suggestion={mockSuggestion}
        currentPrice="15000"
        onApplySuggestion={vi.fn()}
      />
    );
    expect(screen.queryByText(/Use Suggested Price/)).not.toBeInTheDocument();
  });

  it('shows price distribution when details toggled', () => {
    render(
      <PriceDiscoveryWidget
        suggestion={mockSuggestion}
        currentPrice=""
        onApplySuggestion={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('View price distribution'));
    expect(screen.getByText('₹8000 - ₹11000')).toBeInTheDocument();
  });

  it('shows "above avg" text when price is significantly higher', () => {
    render(
      <PriceDiscoveryWidget
        suggestion={mockSuggestion}
        currentPrice="25000"
        onApplySuggestion={vi.fn()}
      />
    );
    expect(screen.getByText(/higher than similar listings/i)).toBeInTheDocument();
  });
});
