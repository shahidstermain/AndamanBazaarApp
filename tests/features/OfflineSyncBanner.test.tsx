import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OfflineSyncBanner } from '../../src/components/OfflineSyncBanner';

// Mock the entire useOfflineSync hook so we control every state branch
vi.mock('../../src/hooks/useOfflineSync', () => ({
  useOfflineSync: vi.fn(),
  createListingSyncHandler: vi.fn(() => vi.fn()),
  createMessageSyncHandler: vi.fn(() => vi.fn()),
  createProfileSyncHandler: vi.fn(() => vi.fn()),
}));

import { useOfflineSync } from '../../src/hooks/useOfflineSync';

const mockUseOfflineSync = useOfflineSync as ReturnType<typeof vi.fn>;

const baseReturn = {
  isOnline: true,
  pendingCount: 0,
  syncingCount: 0,
  failedCount: 0,
  isSyncing: false,
  syncNow: vi.fn(),
  retryFailed: vi.fn(),
  clearCompleted: vi.fn(),
  lastSyncResult: null,
  saveDraft: vi.fn(),
  loadDraft: vi.fn(),
  clearDraft: vi.fn(),
};

describe('OfflineSyncBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOfflineSync.mockReturnValue(baseReturn);
  });

  it('renders nothing when online with no pending or failed items', () => {
    const { container } = render(<OfflineSyncBanner userId="user-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows offline banner with WifiOff message when not online', () => {
    mockUseOfflineSync.mockReturnValue({ ...baseReturn, isOnline: false });
    render(<OfflineSyncBanner userId="user-1" />);
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    expect(screen.getByText('Changes saved locally')).toBeInTheDocument();
  });

  it('shows pending count in offline banner when items are waiting', () => {
    mockUseOfflineSync.mockReturnValue({
      ...baseReturn,
      isOnline: false,
      pendingCount: 3,
    });
    render(<OfflineSyncBanner userId="user-1" />);
    expect(screen.getByText(/3 items waiting to sync/)).toBeInTheDocument();
  });

  it('shows syncing banner when isSyncing is true', () => {
    mockUseOfflineSync.mockReturnValue({
      ...baseReturn,
      isSyncing: true,
      pendingCount: 2,
    });
    render(<OfflineSyncBanner userId="user-1" />);
    expect(screen.getByText(/Syncing 2 items/)).toBeInTheDocument();
  });

  it('shows failed banner with Retry button when failedCount > 0', () => {
    mockUseOfflineSync.mockReturnValue({
      ...baseReturn,
      failedCount: 1,
    });
    render(<OfflineSyncBanner userId="user-1" />);
    expect(screen.getByText(/1 item failed to sync/)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls retryFailed when Retry button is clicked', () => {
    const retryFailed = vi.fn();
    mockUseOfflineSync.mockReturnValue({ ...baseReturn, failedCount: 1, retryFailed });
    render(<OfflineSyncBanner userId="user-1" />);
    fireEvent.click(screen.getByText('Retry'));
    expect(retryFailed).toHaveBeenCalledOnce();
  });

  it('shows pending-online banner with Sync Now button when pendingCount > 0 and online', () => {
    mockUseOfflineSync.mockReturnValue({
      ...baseReturn,
      pendingCount: 2,
    });
    render(<OfflineSyncBanner userId="user-1" />);
    expect(screen.getByText(/2 items ready to sync/)).toBeInTheDocument();
    expect(screen.getByText('Sync Now')).toBeInTheDocument();
  });

  it('calls syncNow when Sync Now button is clicked', () => {
    const syncNow = vi.fn();
    mockUseOfflineSync.mockReturnValue({ ...baseReturn, pendingCount: 1, syncNow });
    render(<OfflineSyncBanner userId="user-1" />);
    fireEvent.click(screen.getByText('Sync Now'));
    expect(syncNow).toHaveBeenCalledOnce();
  });

  it('shows success banner after all items synced', () => {
    mockUseOfflineSync.mockReturnValue({
      ...baseReturn,
      lastSyncResult: { processed: 3, succeeded: 3, failed: 0, errors: [] },
    });
    render(<OfflineSyncBanner userId="user-1" />);
    expect(screen.getByText(/3 items synced successfully/)).toBeInTheDocument();
  });

  it('renders nothing when userId is null', () => {
    const { container } = render(<OfflineSyncBanner userId={null} />);
    expect(container.firstChild).toBeNull();
  });
});
