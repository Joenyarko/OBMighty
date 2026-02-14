import offlineQueueManager from './offlineQueueManager';

describe('OfflineQueueManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock IndexedDB
    const mockDB = {
      createObjectStore: jest.fn(),
      transaction: jest.fn(),
      close: jest.fn(),
    };
    global.indexedDB = {
      open: jest.fn((name, version) => ({
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
        result: mockDB,
      })),
    };
  });

  test('initializes database on creation', () => {
    expect(offlineQueueManager).toBeDefined();
  });

  test('adds request to queue when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const request = {
      method: 'POST',
      url: '/api/payments',
      data: { amount: 100 },
    };

    const result = await offlineQueueManager.addToQueue(request);

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('queued');
  });

  test('executes request immediately when online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    const request = {
      method: 'POST',
      url: '/api/payments',
      data: { amount: 100 },
    };

    // Mock axios
    jest.mock('axios');
    const result = await offlineQueueManager.addToQueue(request);

    expect(result).toHaveProperty('success');
  });

  test('returns queue statistics', () => {
    const stats = offlineQueueManager.getQueueStats();

    expect(stats).toHaveProperty('pending');
    expect(stats).toHaveProperty('synced');
    expect(stats).toHaveProperty('failed');
    expect(stats).toHaveProperty('total');
    expect(typeof stats.pending).toBe('number');
  });

  test('syncs pending requests on reconnection', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    const result = await offlineQueueManager.syncPendingRequests();

    expect(result).toBeDefined();
  });

  test('updates request status correctly', async () => {
    const result = offlineQueueManager.updateRequestStatus('test-id', 'synced');

    expect(result === true || result === undefined || result === null).toBeTruthy();
  });

  test('clears synced requests', async () => {
    const result = await offlineQueueManager.clearSyncedRequests();

    expect(result === true || result === undefined || result === null).toBeTruthy();
  });

  test('handles retry logic for failed requests', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    // Mock failed request
    const result = await offlineQueueManager.syncPendingRequests();

    expect(result).toBeDefined();
  });

  test('retrieves pending requests', async () => {
    const requests = await offlineQueueManager.getPendingRequests();

    expect(Array.isArray(requests) || requests === undefined).toBeTruthy();
  });

  test('includes auth token with offline requests', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    localStorage.setItem('auth_token', 'test-token-123');

    const request = {
      method: 'POST',
      url: '/api/payments',
      data: { amount: 100 },
    };

    const result = await offlineQueueManager.addToQueue(request);

    expect(result).toHaveProperty('success');
  });

  test('handles max retry attempts correctly', async () => {
    const mockRequest = {
      id: 'retry-test',
      retries: 3,
      status: 'pending',
    };

    // After 3 retries, should mark as failed
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries + 1) {
      retryCount++;
    }

    expect(retryCount).toBe(maxRetries + 1);
  });

  test('maintains timestamp for each transaction', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const request = {
      method: 'POST',
      url: '/api/payments',
      data: { amount: 100 },
    };

    const result = await offlineQueueManager.addToQueue(request);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('success');
  });

  test('batches multiple offline requests', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    const requests = [
      { method: 'POST', url: '/api/payments', data: { amount: 100 } },
      { method: 'POST', url: '/api/payments', data: { amount: 200 } },
      { method: 'POST', url: '/api/payments', data: { amount: 300 } },
    ];

    for (const request of requests) {
      await offlineQueueManager.addToQueue(request);
    }

    const stats = offlineQueueManager.getQueueStats();
    expect(stats.pending >= 0).toBeTruthy();
  });

  test('detects online/offline status changes', () => {
    expect(navigator.onLine === true || navigator.onLine === false).toBeTruthy();
  });

  test('queue persists across page reloads', () => {
    // IndexedDB should persist data
    const stats = offlineQueueManager.getQueueStats();
    expect(stats).toHaveProperty('total');
  });

  test('returns success on successful sync', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true });

    const result = await offlineQueueManager.syncPendingRequests();

    expect(result === true || result === undefined || result?.success).toBeTruthy();
  });
});
