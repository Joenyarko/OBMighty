import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { showError } from '../utils/sweetalert';
import {
    TrendingUp,
    Users,
    Zap,
    AlertCircle,
    DollarSign,
    ShoppingCart,
    TrendingDown,
    Clock,
    Eye,
    ArrowUp
} from 'lucide-react';
import '../styles/CompanyDashboard.css';

function CompanyDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [timeframe, setTimeframe] = useState('month');

    useEffect(() => {
        if (user?.role !== 'ceo') {
            showError('Only CEO can access company dashboard');
            return;
        }
        fetchDashboardData();
    }, [user, timeframe]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/company/dashboard');
            setData(response.data);
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="company-dashboard">
                <div className="loading-spinner">Loading dashboard...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="company-dashboard">
                <div className="error-message">Failed to load dashboard data</div>
            </div>
        );
    }

    const { overview, revenue, performance, topWorkers, recentPayments, alerts } = data;

    return (
        <div className="company-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>Company Dashboard</h1>
                    <p>Comprehensive company performance metrics</p>
                </div>
            </div>

            {/* Alerts */}
            {alerts && alerts.length > 0 && (
                <div className="alerts-section">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className={`alert alert-${alert.type}`}>
                            <AlertCircle size={18} />
                            <span>{alert.message}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">Today's Revenue</span>
                        <DollarSign className="kpi-icon" size={20} />
                    </div>
                    <div className="kpi-value">₦{overview.today_revenue.toLocaleString()}</div>
                    <div className="kpi-footer">
                        <TrendingUp size={14} />
                        <span>vs month avg</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">Month Revenue</span>
                        <ShoppingCart className="kpi-icon" size={20} />
                    </div>
                    <div className="kpi-value">₦{overview.month_revenue.toLocaleString()}</div>
                    <div className="kpi-footer">
                        <ArrowUp size={14} />
                        <span>{revenue.monthly_transactions} transactions</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">Active Customers</span>
                        <Users className="kpi-icon" size={20} />
                    </div>
                    <div className="kpi-value">{overview.active_customers}</div>
                    <div className="kpi-footer">
                        <span>of {overview.total_customers} total</span>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">Completion Rate</span>
                        <Zap className="kpi-icon" size={20} />
                    </div>
                    <div className="kpi-value">{overview.completion_rate}%</div>
                    <div className="kpi-footer">
                        <span>customers completed</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Revenue Breakdown */}
                <div className="card">
                    <div className="card-header">
                        <h2>Payment Methods Breakdown</h2>
                    </div>
                    <div className="card-body">
                        <div className="payment-methods">
                            {revenue.by_payment_method && revenue.by_payment_method.length > 0 ? (
                                revenue.by_payment_method.map((method, idx) => (
                                    <div key={idx} className="payment-method-item">
                                        <div className="method-info">
                                            <span className="method-name capitalize">{method.method}</span>
                                            <span className="method-count">{method.count} transactions</span>
                                        </div>
                                        <div className="method-amount">₦{parseFloat(method.total).toLocaleString()}</div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state">No payment data available</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Branch Performance */}
                <div className="card">
                    <div className="card-header">
                        <h2>Branch Performance</h2>
                    </div>
                    <div className="card-body">
                        <div className="branch-list">
                            {performance.by_branch && performance.by_branch.length > 0 ? (
                                performance.by_branch.map((branch) => (
                                    <div key={branch.id} className="branch-item">
                                        <div className="branch-info">
                                            <span className="branch-name">{branch.name}</span>
                                            <span className="branch-customers">{branch.customers} customers</span>
                                        </div>
                                        <div className="branch-stats">
                                            <span>₦{parseFloat(branch.month_revenue).toLocaleString()}</span>
                                            <span className="stat-secondary">{branch.payment_count} payments</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state">No branch data available</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Workers & Recent Payments */}
            <div className="dashboard-grid">
                {/* Top Workers */}
                <div className="card">
                    <div className="card-header">
                        <h2>Top Performers</h2>
                    </div>
                    <div className="card-body">
                        <div className="workers-list">
                            {topWorkers && topWorkers.length > 0 ? (
                                topWorkers.map((worker, idx) => (
                                    <div key={worker.id} className="worker-item">
                                        <div className="worker-rank">{idx + 1}</div>
                                        <div className="worker-info">
                                            <span className="worker-name">{worker.name}</span>
                                            <span className="worker-stats">{worker.customers} customers</span>
                                        </div>
                                        <div className="worker-revenue">
                                            <span>₦{parseFloat(worker.month_revenue).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state">No worker data available</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Payments */}
                <div className="card">
                    <div className="card-header">
                        <h2>Recent Payments</h2>
                    </div>
                    <div className="card-body">
                        <div className="payments-list">
                            {recentPayments && recentPayments.length > 0 ? (
                                recentPayments.map((payment) => (
                                    <div key={payment.id} className="payment-item">
                                        <div className="payment-info">
                                            <span className="payment-customer">{payment.customer_name}</span>
                                            <span className="payment-date">{payment.date}</span>
                                        </div>
                                        <div className="payment-amount">₦{parseFloat(payment.amount).toLocaleString()}</div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state">No recent payments</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="summary-stats">
                <div className="stat">
                    <span className="stat-label">Total Branches</span>
                    <span className="stat-value">{overview.total_branches}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Total Users</span>
                    <span className="stat-value">{overview.total_users}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Total Customers</span>
                    <span className="stat-value">{overview.total_customers}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Monthly Transactions</span>
                    <span className="stat-value">{revenue.monthly_transactions}</span>
                </div>
            </div>
        </div>
    );
}

export default CompanyDashboard;
