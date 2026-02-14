/**
 * Offline Queue Management System
 * Manages pending transactions when offline and syncs when online
 */

const DB_NAME = 'OBMighty';
const STORE_NAME = 'pending_transactions';
const DB_VERSION = 1;

class OfflineQueueManager {
    constructor() {
        this.db = null;
        this.isOnline = navigator.onLine;
        this.initializeDB();
        this.setupEventListeners();
    }

    /**
     * Initialize IndexedDB
     */
    initializeDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB initialization failed');
                reject(request.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { 
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    objectStore.createIndex('status', 'status', { unique: false });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
        });
    }

    /**
     * Setup online/offline event listeners
     */
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('App is online. Syncing queued requests...');
            this.syncPendingRequests();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('App is offline. Requests will be queued.');
        });
    }

    /**
     * Add a request to the queue
     */
    async addToQueue(request) {
        if (this.isOnline) {
            // If online, execute immediately
            return this.executeRequest(request);
        }

        // If offline, store in IndexedDB
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);

            const queueItem = {
                ...request,
                status: 'pending',
                timestamp: Date.now(),
                attempts: 0,
            };

            const addRequest = objectStore.add(queueItem);

            addRequest.onsuccess = () => {
                console.log('Request queued:', queueItem);
                resolve({
                    success: true,
                    queued: true,
                    id: addRequest.result,
                    message: 'Request will be synced when online',
                });
            };

            addRequest.onerror = () => {
                reject(addRequest.error);
            };
        });
    }

    /**
     * Execute a request (online)
     */
    async executeRequest(request) {
        try {
            const response = await fetch(request.url, {
                method: request.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    ...request.headers,
                },
                body: request.body ? JSON.stringify(request.body) : null,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data,
                queued: false,
            };
        } catch (error) {
            console.error('Request execution failed:', error);
            throw error;
        }
    }

    /**
     * Get all pending requests
     */
    async getPendingRequests() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const index = objectStore.index('status');
            const request = index.getAll('pending');

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Update request status
     */
    async updateRequestStatus(id, status) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const getRequest = objectStore.get(id);

            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    item.status = status;
                    item.updated = Date.now();
                    const updateRequest = objectStore.put(item);

                    updateRequest.onsuccess = () => {
                        resolve();
                    };

                    updateRequest.onerror = () => {
                        reject(updateRequest.error);
                    };
                } else {
                    reject(new Error('Request not found'));
                }
            };

            getRequest.onerror = () => {
                reject(getRequest.error);
            };
        });
    }

    /**
     * Sync pending requests with server
     */
    async syncPendingRequests() {
        const pending = await this.getPendingRequests();
        
        if (pending.length === 0) {
            console.log('No pending requests to sync');
            return { success: true, synced: 0 };
        }

        console.log(`Syncing ${pending.length} pending requests...`);

        let syncedCount = 0;
        let failedCount = 0;

        for (const item of pending) {
            try {
                const response = await this.executeRequest(item);
                await this.updateRequestStatus(item.id, 'synced');
                syncedCount++;
                console.log(`Synced request ${item.id}`);
            } catch (error) {
                failedCount++;
                console.error(`Failed to sync request ${item.id}:`, error);
                
                // Update attempts
                item.attempts = (item.attempts || 0) + 1;
                
                // Retry max 3 times before marking as failed
                if (item.attempts >= 3) {
                    await this.updateRequestStatus(item.id, 'failed');
                } else {
                    // Keep as pending for retry
                    await this.updateRequestStatus(item.id, 'pending');
                }
            }
        }

        const result = {
            success: failedCount === 0,
            synced: syncedCount,
            failed: failedCount,
            total: pending.length,
        };

        console.log('Sync complete:', result);
        return result;
    }

    /**
     * Clear completed/failed requests
     */
    async clearSyncedRequests() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);

            // Get all synced and failed items
            const index = objectStore.index('status');
            const syncedRequest = index.getAll('synced');

            syncedRequest.onsuccess = () => {
                const items = syncedRequest.result;
                items.forEach(item => {
                    objectStore.delete(item.id);
                });
                resolve(items.length);
            };

            syncedRequest.onerror = () => {
                reject(syncedRequest.error);
            };
        });
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        const all = await new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return {
            total: all.length,
            pending: all.filter(item => item.status === 'pending').length,
            synced: all.filter(item => item.status === 'synced').length,
            failed: all.filter(item => item.status === 'failed').length,
            isOnline: this.isOnline,
        };
    }
}

// Export singleton instance
export const offlineQueueManager = new OfflineQueueManager();
