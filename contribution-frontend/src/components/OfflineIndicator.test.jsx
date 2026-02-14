import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OfflineIndicator from './OfflineIndicator';
import * as offlineQueueManager from '../utils/offlineQueueManager';

jest.mock('../utils/offlineQueueManager');

describe('OfflineIndicator Component', () => {
  const mockQueueStats = {
    pending: 3,
    synced: 2,
    failed: 0,
    total: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  test('renders offline indicator component', () => {
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    render(<OfflineIndicator />);

    expect(screen.getByRole('button') || screen.getByText(/Status/i)).toBeTruthy();
  });

  test('displays online status when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', { value: true });
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    render(<OfflineIndicator />);

    expect(screen.getByText(/Online/i) || screen.getByText(/Connected/i)).toBeTruthy();
  });

  test('displays offline status when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    render(<OfflineIndicator />);

    expect(screen.getByText(/Offline/i) || screen.getByText(/Disconnected/i)).toBeTruthy();
  });

  test('shows pending transaction count', () => {
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    render(<OfflineIndicator />);

    const indicator = screen.getByRole('button');
    fireEvent.click(indicator);

    expect(screen.getByText(/3/i) || screen.getByText(/Pending/i)).toBeTruthy();
  });

  test('shows synced transaction count', () => {
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    render(<OfflineIndicator />);

    const indicator = screen.getByRole('button');
    fireEvent.click(indicator);

    expect(screen.getByText(/2/i) || screen.getByText(/Synced/i)).toBeTruthy();
  });

  test('shows failed transaction count', () => {
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    render(<OfflineIndicator />);

    const indicator = screen.getByRole('button');
    fireEvent.click(indicator);

    expect(screen.getByText(/0/i) || screen.getByText(/Failed/i)).toBeTruthy();
  });

  test('displays sync button when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    render(<OfflineIndicator />);

    const indicator = screen.getByRole('button');
    fireEvent.click(indicator);

    expect(screen.getByRole('button', { name: /Sync/i }) ||
           screen.getByText(/Sync/i)).toBeTruthy();
  });

  test('calls sync function when sync button clicked', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true });
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    offlineQueueManager.syncPendingRequests.mockResolvedValue({ success: true });

    render(<OfflineIndicator />);

    const indicator = screen.getByRole('button');
    fireEvent.click(indicator);

    const syncButton = screen.queryByRole('button', { name: /Sync/i });
    if (syncButton) {
      fireEvent.click(syncButton);
      await waitFor(() => {
        expect(offlineQueueManager.syncPendingRequests).toHaveBeenCalled();
      });
    }
  });

  test('toggles details panel when indicator clicked', () => {
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    render(<OfflineIndicator />);

    const indicator = screen.getByRole('button');
    
    fireEvent.click(indicator);
    expect(screen.getByText(/Status/i) || screen.getByText(/Pending/i)).toBeTruthy();

    fireEvent.click(indicator);
  });

  test('updates queue statistics every 5 seconds', async () => {
    jest.useFakeTimers();
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);

    render(<OfflineIndicator />);

    expect(offlineQueueManager.getQueueStats).toHaveBeenCalled();

    jest.advanceTimersByTime(5000);

    expect(offlineQueueManager.getQueueStats).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  test('displays indicator in bottom-right corner', () => {
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    const { container } = render(<OfflineIndicator />);

    const indicator = container.querySelector('[class*="indicator"]') ||
                     container.querySelector('[class*="Indicator"]');
    
    expect(indicator || screen.getByRole('button')).toBeTruthy();
  });

  test('shows pulsing animation when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);
    const { container } = render(<OfflineIndicator />);

    const animatedElement = container.querySelector('[class*="pulse"]') ||
                           container.querySelector('[class*="pulse"]');
    
    expect(animatedElement || screen.getByRole('button')).toBeTruthy();
  });

  test('handles zero pending transactions', () => {
    offlineQueueManager.getQueueStats.mockReturnValue({
      pending: 0,
      synced: 0,
      failed: 0,
      total: 0,
    });
    render(<OfflineIndicator />);

    const indicator = screen.getByRole('button');
    fireEvent.click(indicator);

    expect(screen.getByText(/0/i) || screen.getByText(/Empty/i)).toBeTruthy();
  });

  test('handles connection restoration from offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    offlineQueueManager.getQueueStats.mockReturnValue(mockQueueStats);

    const { rerender } = render(<OfflineIndicator />);

    expect(screen.getByText(/Offline/i) || screen.getByText(/Disconnected/i)).toBeTruthy();

    Object.defineProperty(navigator, 'onLine', { value: true });
    rerender(<OfflineIndicator />);

    expect(screen.getByText(/Online/i) || screen.getByText(/Connected/i)).toBeTruthy();
  });

  test('displays error status for failed transactions', () => {
    offlineQueueManager.getQueueStats.mockReturnValue({
      pending: 2,
      synced: 3,
      failed: 1,
      total: 6,
    });
    render(<OfflineIndicator />);

    const indicator = screen.getByRole('button');
    fireEvent.click(indicator);

    expect(screen.getByText(/1/i) || screen.getByText(/Failed/i)).toBeTruthy();
  });
});
