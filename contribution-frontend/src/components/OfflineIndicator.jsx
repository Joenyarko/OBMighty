import { useState, useEffect } from 'react';
import { WifiOff, Check, AlertCircle, Upload } from 'lucide-react';
import { offlineQueueManager } from '../utils/offlineQueueManager';
import '../styles/OfflineIndicator.css';

function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [stats, setStats] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        updateStats();
        const interval = setInterval(updateStats, 5000);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const updateStats = async () => {
        try {
            const newStats = await offlineQueueManager.getQueueStats();
            setStats(newStats);
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            await offlineQueueManager.syncPendingRequests();
            await updateStats();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    if (isOnline && (!stats || stats.pending === 0)) {
        return null; // Don't show indicator when online and no pending items
    }

    return (
        <>
            <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
                <button
                    className="indicator-button"
                    onClick={() => setShowDetails(!showDetails)}
                    title={isOnline ? 'Click to view sync status' : 'Offline - changes will sync when online'}
                >
                    {isOnline ? (
                        <>
                            {stats?.pending > 0 ? (
                                <>
                                    <Upload size={16} />
                                    <span>{stats.pending} pending</span>
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    <span>Synced</span>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <WifiOff size={16} />
                            <span>Offline Mode</span>
                        </>
                    )}
                </button>
            </div>

            {/* Details Modal */}
            {showDetails && (
                <div className="offline-details">
                    <div className="details-card">
                        <div className="details-header">
                            <h3>Sync Status</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowDetails(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="details-content">
                            <div className="status-line">
                                <span className="status-label">Connection:</span>
                                <span className={`status-value ${isOnline ? 'online' : 'offline'}`}>
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            {stats && (
                                <>
                                    <div className="status-line">
                                        <span className="status-label">Total Pending:</span>
                                        <span className="status-value">{stats.pending}</span>
                                    </div>

                                    <div className="status-line">
                                        <span className="status-label">Synced:</span>
                                        <span className="status-value success">{stats.synced}</span>
                                    </div>

                                    {stats.failed > 0 && (
                                        <div className="status-line">
                                            <span className="status-label">Failed:</span>
                                            <span className="status-value error">{stats.failed}</span>
                                        </div>
                                    )}

                                    {stats.pending > 0 && isOnline && (
                                        <button
                                            className="btn-sync"
                                            onClick={handleSync}
                                            disabled={syncing}
                                        >
                                            {syncing ? 'Syncing...' : 'Sync Now'}
                                        </button>
                                    )}
                                </>
                            )}

                            {!isOnline && (
                                <div className="offline-notice">
                                    <AlertCircle size={16} />
                                    <p>Your changes will be saved locally and synced when you're back online.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default OfflineIndicator;
