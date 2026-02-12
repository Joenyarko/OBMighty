import { useState, useEffect } from 'react';
import { auditLogAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/App.css';

function ActivityLog() {
    const { user, isCEO, isSecretary } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        date: '',
        user_id: '',
        action: ''
    });

    useEffect(() => {
        fetchLogs();
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [filters]);

    const fetchUsers = async () => {
        try {
            const response = await userAPI.getAll();
            setUsers(response.data || response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '')
            );
            const response = await auditLogAPI.getAll(params);
            setLogs(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const formatAction = (action) => {
        return action.replace(/_/g, ' ').toUpperCase();
    };

    const formatValues = (values) => {
        if (!values) return '-';
        try {
            // Check if it's our custom payment log format
            if (values.customer || values.payment_amount) {
                let details = [];
                if (values.payment_amount) details.push(`Payment: GHS${values.payment_amount}`);
                if (values.card && values.card !== 'N/A') details.push(`Card: ${values.card}`);
                if (values.boxes_filled) details.push(`Boxes Filled: ${values.boxes_filled}`);
                if (values.customer) details.push(`Customer: ${values.customer}`);
                if (values.payment_method) details.push(`Method: ${values.payment_method}`);

                if (details.length > 0) return details.join(', ');
            }

            // Fallback for other logs or raw JSON
            const str = JSON.stringify(values);
            // Clean up JSON syntax for readability if it's simple
            if (str.length < 100) return str.replace(/[{}"]/g, '').replace(/,/g, ', ').replace(/:/g, ': ');

            return str.substring(0, 50) + '...';
        } catch (e) {
            return '-';
        }
    };

    return (
        <div className="activity-log-page">
            <h1 style={{ color: 'var(--primary-color)', marginBottom: '24px' }}>System Activity Logs</h1>

            <div className="card" style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter by Date</label>
                    <input
                        type="date"
                        name="date"
                        value={filters.date}
                        onChange={handleFilterChange}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter by User</label>
                    <select
                        name="user_id"
                        value={filters.user_id}
                        onChange={handleFilterChange}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', minWidth: '150px' }}
                    >
                        <option value="">All Users</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter by Action</label>
                    <select
                        name="action"
                        value={filters.action}
                        onChange={handleFilterChange}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', minWidth: '150px' }}
                    >
                        <option value="">All Actions</option>
                        <option value="login">Login</option>
                        <option value="logout">Logout</option>
                        <option value="payment_recorded">Payment Recorded</option>
                        <option value="customer_created">Customer Created</option>
                        <option value="customer_updated">Customer Updated</option>
                        <option value="customer_deleted">Customer Deleted</option>
                        <option value="user_created">User Created</option>
                        <option value="user_updated">User Updated</option>
                        <option value="user_deleted">User Deleted</option>
                    </select>
                </div>
            </div>

            <div className="card" style={{ background: 'var(--card-bg)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Date/Time</th>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>User</th>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Action</th>
                                <th style={{ padding: '16px', color: 'var(--text-secondary)' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }}>Loading logs...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No activity logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px', fontWeight: '500' }}>
                                            {log.user?.name || `User #${log.user_id}`}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                background: log.action.includes('delete') ? 'rgba(244, 67, 54, 0.1)' :
                                                    log.action.includes('create') || log.action.includes('payment') ? 'rgba(76, 175, 80, 0.1)' :
                                                        'rgba(33, 150, 243, 0.1)',
                                                color: log.action.includes('delete') ? '#f44336' :
                                                    log.action.includes('create') || log.action.includes('payment') ? '#4caf50' :
                                                        '#2196f3'
                                            }}>
                                                {formatAction(log.action)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {formatValues(log.new_values)}
                                        </td>
                                        {/* IP Address removed as per user request */}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ActivityLog;
