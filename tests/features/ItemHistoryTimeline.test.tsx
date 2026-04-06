import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ItemHistoryTimeline, type ItemHistoryEntry } from '../../src/components/ItemHistoryTimeline';

const makeEntry = (overrides: Partial<ItemHistoryEntry> = {}): ItemHistoryEntry => ({
  id: 'entry-1',
  seller_id: 'user-1',
  seller_name: 'Alice',
  seller_trust_level: 'verified',
  title: 'Used Laptop',
  price: 25000,
  sold_at: '2024-06-01T00:00:00Z',
  depth: 0,
  ...overrides,
});

const twoEntries: ItemHistoryEntry[] = [
  makeEntry({ id: 'entry-1', depth: 1, seller_name: 'Alice', price: 30000 }),
  makeEntry({ id: 'entry-2', depth: 0, seller_name: 'Bob', price: 25000 }),
];

const threeEntries: ItemHistoryEntry[] = [
  ...twoEntries,
  makeEntry({ id: 'entry-3', depth: 2, seller_name: 'Carol', price: 35000 }),
];

describe('ItemHistoryTimeline', () => {
  it('returns null when history has only one entry', () => {
    const { container } = render(
      <ItemHistoryTimeline history={[makeEntry()]} currentListingId="entry-1" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when history is empty', () => {
    const { container } = render(
      <ItemHistoryTimeline history={[]} currentListingId="entry-1" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders heading and seller names for two entries', () => {
    render(
      <ItemHistoryTimeline history={twoEntries} currentListingId="entry-2" />
    );
    expect(screen.getByText('Item History')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('marks current listing with "Current" badge', () => {
    render(
      <ItemHistoryTimeline history={twoEntries} currentListingId="entry-2" />
    );
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('displays trust level badge for each seller', () => {
    render(
      <ItemHistoryTimeline history={twoEntries} currentListingId="entry-2" />
    );
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1);
  });

  it('shows prices in INR format', () => {
    render(
      <ItemHistoryTimeline history={twoEntries} currentListingId="entry-2" />
    );
    expect(screen.getByText('₹30,000')).toBeInTheDocument();
    expect(screen.getByText('₹25,000')).toBeInTheDocument();
  });

  it('shows Platform Loyalist badge when 3+ entries', () => {
    render(
      <ItemHistoryTimeline history={threeEntries} currentListingId="entry-1" />
    );
    expect(screen.getByText('Platform Loyalist Item')).toBeInTheDocument();
  });

  it('does NOT show Platform Loyalist badge for exactly 2 entries', () => {
    render(
      <ItemHistoryTimeline history={twoEntries} currentListingId="entry-2" />
    );
    expect(screen.queryByText('Platform Loyalist Item')).not.toBeInTheDocument();
  });

  it('shows correct count in subtitle', () => {
    render(
      <ItemHistoryTimeline history={twoEntries} currentListingId="entry-2" />
    );
    expect(screen.getByText(/Previously sold 1 time/)).toBeInTheDocument();
  });
});
