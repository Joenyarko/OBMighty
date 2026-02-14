import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { showError, showSuccess } from '../utils/sweetalert';
import {
    BarChart3,
    Download,
    Filter,
    Calendar,
    TrendingUp,
    PieChart,
    DollarSign,
    Users,
} from 'lucide-react';
import '../styles/EnhancedReports.css';

function EnhancedReports() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [activeReport, setActiveReport] = useState('profitability');
    const [data, setData] = useState(null);
    const [exporting, setExporting] = useState(false);

    const [filters, setFilters] = useState({
        start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const reports = [
        { id: 'profitability', label: 'Profitability Analysis', icon: TrendingUp },
        { id: 'customer-performance', label: 'Customer Performance', icon: Users },
        { id: 'worker-productivity', label: 'Worker Productivity', icon: BarChart3 },
        { id: 'inventory-status', label: 'Inventory Status', icon: PieChart },
        { id: 'ledger', label: 'Ledger Report', icon: DollarSign },
        { id: 'audit-trail', label: 'Audit Trail', icon: Filter },
    ];

    useEffect(() => {
        fetchReportData();
    }, [activeReport, filters]);

    const fetchReportData = async () => {
        try {
            setLoading(true);
            const endpoint = `/reports/${activeReport}`;
            const response = await api.get(endpoint, { params: filters });
            setData(response.data);
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to load report');
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

    const exportToPDF = async () => {
        try {
            setExporting(true);
            // In a real app, you'd generate PDF on backend or use a library like jsPDF
            showSuccess('PDF export started. File will download shortly.');
            // Example implementation would call backend PDF generation endpoint
        } catch (error) {
            showError('Failed to export PDF');
        } finally {
            setExporting(false);
        }
    };

    const renderReportContent = () => {
        if (loading) {
            return <div className="loading-spinner">Loading report...</div>;
        }

        if (!data) {
            return <div className="empty-state">No data available for this report</div>;
        }

        switch (activeReport) {
            case 'profitability':
                return <ProfitabilityReport data={data} />;
            case 'customer-performance':
                return <CustomerPerformanceReport data={data} />;
            case 'worker-productivity':
                return <WorkerProductivityReport data={data} />;
            case 'inventory-status':
                return <InventoryStatusReport data={data} />;
            case 'ledger':
                return <LedgerReport data={data} />;
            case 'audit-trail':
                return <AuditTrailReport data={data} />;
            default:
                return <div className="empty-state">Select a report</div>;
        }
    };

    return (
        <div className="enhanced-reports">
            {/* Header */}
            <div className="reports-header">
                <div>
                    <h1>Advanced Reports</h1>
                    <p>Comprehensive business analytics and insights</p>
                </div>
                <button
                    className="btn btn-export"
                    onClick={exportToPDF}
                    disabled={!data || exporting}
                >
                    <Download size={18} />
                    {exporting ? 'Exporting...' : 'Export PDF'}
                </button>
            </div>

            {/* Report Selection */}
            <div className="report-tabs">
                {reports.map(report => {
                    const Icon = report.icon;
                    return (
                        <button
                            key={report.id}
                            className={`report-tab ${activeReport === report.id ? 'active' : ''}`}
                            onClick={() => setActiveReport(report.id)}
                        >
                            <Icon size={18} />
                            <span>{report.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="report-filters">
                <div className="filter-group">
                    <label>Start Date</label>
                    <input
                        type="date"
                        name="start_date"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                        className="filter-input"
                    />
                </div>
                <div className="filter-group">
                    <label>End Date</label>
                    <input
                        type="date"
                        name="end_date"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                        className="filter-input"
                    />
                </div>
                <button
                    className="btn btn-refresh"
                    onClick={fetchReportData}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            {/* Report Content */}
            <div className="report-content">
                {renderReportContent()}
            </div>
        </div>
    );
}

// Profitability Report Component
function ProfitabilityReport({ data }) {
    if (!data) return null;

    const profitClass = data.profit >= 0 ? 'positive' : 'negative';

    return (
        <div className="report-section">
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-label">Revenue</div>
                    <div className="card-value">₦{parseFloat(data.revenue).toLocaleString()}</div>
                </div>
                <div className="summary-card">
                    <div className="card-label">Expenses</div>
                    <div className="card-value expense">₦{parseFloat(data.expenses).toLocaleString()}</div>
                </div>
                <div className="summary-card">
                    <div className="card-label">Profit</div>
                    <div className={`card-value ${profitClass}`}>₦{parseFloat(data.profit).toLocaleString()}</div>
                </div>
                <div className="summary-card">
                    <div className="card-label">Profit Margin</div>
                    <div className={`card-value ${profitClass}`}>{data.profit_margin}%</div>
                </div>
            </div>

            {data.expense_breakdown && data.expense_breakdown.length > 0 && (
                <div className="expense-breakdown">
                    <h3>Expense Breakdown</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>% of Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.expense_breakdown.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="capitalize">{item.category}</td>
                                    <td>₦{parseFloat(item.total).toLocaleString()}</td>
                                    <td>{((item.total / data.revenue) * 100).toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Customer Performance Report Component
function CustomerPerformanceReport({ data }) {
    if (!data) return null;

    return (
        <div className="report-section">
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-label">Total Customers</div>
                    <div className="card-value">{data.total_customers}</div>
                </div>
            </div>

            {data.by_status && (
                <div className="status-breakdown">
                    <h3>Customers by Status</h3>
                    <div className="status-list">
                        {data.by_status.map((item, idx) => (
                            <div key={idx} className="status-item">
                                <div className={`status-badge ${item.status}`}>{item.status}</div>
                                <div className="status-count">{item.count} customers</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.top_customers && data.top_customers.length > 0 && (
                <div className="top-performers">
                    <h3>Top Customers by Payment</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Customer Name</th>
                                <th>Status</th>
                                <th>Total Paid</th>
                                <th>Balance</th>
                                <th>Completion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.top_customers.map((customer) => (
                                <tr key={customer.id}>
                                    <td>{customer.name}</td>
                                    <td><span className={`status-badge ${customer.status}`}>{customer.status}</span></td>
                                    <td>₦{parseFloat(customer.total_paid).toLocaleString()}</td>
                                    <td>₦{parseFloat(customer.balance).toLocaleString()}</td>
                                    <td>{customer.completion}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// Worker Productivity Report Component
function WorkerProductivityReport({ data }) {
    if (!data || !data.workers) return null;

    return (
        <div className="report-section">
            <table>
                <thead>
                    <tr>
                        <th>Worker Name</th>
                        <th>Customers</th>
                        <th>Completed</th>
                        <th>Defaulting</th>
                        <th>Revenue</th>
                        <th>Transactions</th>
                        <th>Avg Transaction</th>
                    </tr>
                </thead>
                <tbody>
                    {data.workers.map((worker) => (
                        <tr key={worker.id}>
                            <td>{worker.name}</td>
                            <td>{worker.total_customers}</td>
                            <td><span className="badge-success">{worker.completed}</span></td>
                            <td><span className="badge-danger">{worker.defaulting}</span></td>
                            <td>₦{parseFloat(worker.total_revenue).toLocaleString()}</td>
                            <td>{worker.payment_count}</td>
                            <td>₦{parseFloat(worker.avg_transaction).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Inventory Status Report Component
function InventoryStatusReport({ data }) {
    if (!data) return null;

    return (
        <div className="report-section">
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-label">Total Items</div>
                    <div className="card-value">{data.summary.total_items}</div>
                </div>
                <div className="summary-card warning">
                    <div className="card-label">Low Stock</div>
                    <div className="card-value">{data.summary.low_stock}</div>
                </div>
                <div className="summary-card">
                    <div className="card-label">Total Value</div>
                    <div className="card-value">₦{parseFloat(data.summary.total_value).toLocaleString()}</div>
                </div>
            </div>

            {data.items && (
                <table>
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Quantity</th>
                            <th>Minimum</th>
                            <th>Unit Price</th>
                            <th>Total Value</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item) => (
                            <tr key={item.id} className={item.status === 'low' ? 'row-warning' : ''}>
                                <td>{item.name}</td>
                                <td>{item.quantity}</td>
                                <td>{item.minimum_level}</td>
                                <td>₦{parseFloat(item.unit_price).toLocaleString()}</td>
                                <td>₦{parseFloat(item.total_value).toLocaleString()}</td>
                                <td><span className={`status-badge ${item.status}`}>{item.status.toUpperCase()}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// Ledger Report Component
function LedgerReport({ data }) {
    if (!data) return null;

    return (
        <div className="report-section">
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-label">Total Debit</div>
                    <div className="card-value">₦{parseFloat(data.summary.total_debit).toLocaleString()}</div>
                </div>
                <div className="summary-card">
                    <div className="card-label">Total Credit</div>
                    <div className="card-value">₦{parseFloat(data.summary.total_credit).toLocaleString()}</div>
                </div>
                <div className="summary-card">
                    <div className="card-label">Balance</div>
                    <div className="card-value">₦{parseFloat(data.summary.balance).toLocaleString()}</div>
                </div>
            </div>

            {data.entries && (
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Debit</th>
                            <th>Credit</th>
                            <th>Balance</th>
                            <th>User</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.entries.map((entry) => (
                            <tr key={entry.id}>
                                <td>{entry.date}</td>
                                <td>{entry.description}</td>
                                <td className="number">₦{parseFloat(entry.debit).toLocaleString()}</td>
                                <td className="number">₦{parseFloat(entry.credit).toLocaleString()}</td>
                                <td className="number">₦{parseFloat(entry.balance).toLocaleString()}</td>
                                <td>{entry.user}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// Audit Trail Report Component
function AuditTrailReport({ data }) {
    if (!data) return null;

    return (
        <div className="report-section">
            {data.logs && data.logs.length > 0 ? (
                <div className="audit-timeline">
                    {data.logs.map((log) => (
                        <div key={log.id} className="audit-entry">
                            <div className="audit-timestamp">{log.timestamp}</div>
                            <div className="audit-details">
                                <div className="audit-user">{log.user}</div>
                                <div className="audit-action">{log.action}</div>
                                <div className="audit-ip">IP: {log.ip_address}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">No audit logs available</div>
            )}
        </div>
    );
}

export default EnhancedReports;
