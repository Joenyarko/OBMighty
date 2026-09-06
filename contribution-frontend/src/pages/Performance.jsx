import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { showError } from '../utils/sweetalert';
import { Users, DollarSign, UserCheck, CheckCircle2, TrendingUp, Calendar, Search, ArrowLeft, Award, Shield } from 'lucide-react';
import '../styles/Performance.css';

function Performance() {
    const { workerId } = useParams();
    const navigate = useNavigate();
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [workerSearch, setWorkerSearch] = useState('');

    useEffect(() => {
        fetchPerformance();
    }, [workerId]);

    const fetchPerformance = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/sales/${workerId}/performance`);
            setPerformance(response.data);
        } catch (error) {
            console.error('Failed to fetch performance data:', error);
            showError('Failed to load performance data');
        } finally {
            setLoading(false);
        }
    };

    const getPerformanceLevel = (score) => {
        if (score >= 80) return { level: 'Excellent', color: '#10B981' };
        if (score >= 60) return { level: 'Good', color: '#3B82F6' };
        if (score >= 40) return { level: 'Average', color: '#F59E0B' };
        return { level: 'Needs Improvement', color: '#EF4444' };
    };

    if (loading) {
        return (
            <div className="performance-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading performance intelligence...</p>
                </div>
            </div>
        );
    }

    if (!performance) {
        return (
            <div className="performance-page">
                <div className="error-container">
                    <p>No performance data available for this user.</p>
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const isManager = performance.is_manager;
    const worker = performance.worker;
    const performanceLevel = getPerformanceLevel(performance.performance_score);
    const workers = performance.workers || [];

    const filteredWorkers = workers.filter(w => 
        w.name.toLowerCase().includes(workerSearch.toLowerCase()) ||
        (w.phone && w.phone.includes(workerSearch)) ||
        (w.email && w.email.toLowerCase().includes(workerSearch.toLowerCase()))
    );

    return (
        <div className="performance-page">
            {/* Header */}
            <div className="page-header">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="page-title-group">
                    <h1>
                        {isManager ? '🏢 Manager Performance' : '🏆 Worker Performance'}
                    </h1>
                    <span className="user-role-badge">
                        {worker.role?.toUpperCase() || 'STAFF'}
                    </span>
                </div>
            </div>

            {/* Overview Profile Card */}
            <div className="worker-overview-card">
                <div className="worker-info">
                    <div className="worker-avatar">
                        {worker.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="worker-details">
                        <h2>{worker.name}</h2>
                        <div className="worker-tags">
                            <span className="tag-item">
                                <Shield size={14} /> {worker.role}
                            </span>
                            <span className="tag-item">
                                📍 {worker.branch || 'Head Office / All Branches'}
                            </span>
                            {isManager && (
                                <span className="tag-item highlight">
                                    <Users size={14} /> {worker.total_workers || workers.length} Workers Managed
                                </span>
                            )}
                            {worker.joined_date && (
                                <span className="tag-item">
                                    <Calendar size={14} /> Joined {new Date(worker.joined_date).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="performance-score-badge" style={{ borderColor: performanceLevel.color }}>
                    <div 
                        className="score-circle" 
                        style={{ 
                            background: `conic-gradient(${performanceLevel.color} ${performance.performance_score * 3.6}deg, rgba(255,255,255,0.08) 0deg)` 
                        }}
                    >
                        <div className="score-inner">
                            <span className="score-value">{performance.performance_score}</span>
                            <span className="score-max">/100</span>
                        </div>
                    </div>
                    <p className="performance-level" style={{ color: performanceLevel.color }}>
                        {performanceLevel.level}
                    </p>
                </div>
            </div>

            {/* Score Breakdown Section */}
            <div className="score-breakdown-section">
                <h3>📈 Performance Breakdown</h3>
                <div className="score-breakdown-grid">
                    <div className="breakdown-item">
                        <div className="breakdown-header">
                            <span className="breakdown-label">Sales Volume</span>
                            <span className="breakdown-score">{performance.score_breakdown?.sales_volume?.toFixed(1) || 0}/40</span>
                        </div>
                        <div className="breakdown-bar">
                            <div 
                                className="breakdown-fill" 
                                style={{ 
                                    width: `${Math.min(100, ((performance.score_breakdown?.sales_volume || 0) / 40) * 100)}%`, 
                                    background: '#10B981' 
                                }}
                            ></div>
                        </div>
                    </div>

                    <div className="breakdown-item">
                        <div className="breakdown-header">
                            <span className="breakdown-label">{isManager ? 'Team Activity' : 'Transaction Frequency'}</span>
                            <span className="breakdown-score">{performance.score_breakdown?.transaction_frequency?.toFixed(1) || 0}/20</span>
                        </div>
                        <div className="breakdown-bar">
                            <div 
                                className="breakdown-fill" 
                                style={{ 
                                    width: `${Math.min(100, ((performance.score_breakdown?.transaction_frequency || 0) / 20) * 100)}%`, 
                                    background: '#3B82F6' 
                                }}
                            ></div>
                        </div>
                    </div>

                    <div className="breakdown-item">
                        <div className="breakdown-header">
                            <span className="breakdown-label">Customer Retention</span>
                            <span className="breakdown-score">{performance.score_breakdown?.customer_retention?.toFixed(1) || 0}/25</span>
                        </div>
                        <div className="breakdown-bar">
                            <div 
                                className="breakdown-fill" 
                                style={{ 
                                    width: `${Math.min(100, ((performance.score_breakdown?.customer_retention || 0) / 25) * 100)}%`, 
                                    background: '#F59E0B' 
                                }}
                            ></div>
                        </div>
                    </div>

                    <div className="breakdown-item">
                        <div className="breakdown-header">
                            <span className="breakdown-label">Completion Rate</span>
                            <span className="breakdown-score">{performance.score_breakdown?.completion_rate?.toFixed(1) || 0}/25</span>
                        </div>
                        <div className="breakdown-bar">
                            <div 
                                className="breakdown-fill" 
                                style={{ 
                                    width: `${Math.min(100, ((performance.score_breakdown?.completion_rate || 0) / 25) * 100)}%`, 
                                    background: '#8B5CF6' 
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Highlights Grid */}
            <div className="metrics-section">
                <h3>💰 {isManager ? 'Branch Sales & Collections' : 'Sales Metrics'}</h3>
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon">💵</div>
                        <div className="metric-content">
                            <p className="metric-label">Today's Sales</p>
                            <p className="metric-value">GHS {parseFloat(performance.sales_metrics?.today?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="metric-sub">{performance.sales_metrics?.today?.transactions || 0} transactions today</p>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">📊</div>
                        <div className="metric-content">
                            <p className="metric-label">This Week</p>
                            <p className="metric-value">GHS {parseFloat(performance.sales_metrics?.this_week?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="metric-sub">{performance.sales_metrics?.this_week?.transactions || 0} transactions this week</p>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">📅</div>
                        <div className="metric-content">
                            <p className="metric-label">This Month</p>
                            <p className="metric-value">GHS {parseFloat(performance.sales_metrics?.this_month?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="metric-sub">{performance.sales_metrics?.this_month?.transactions || 0} transactions</p>
                        </div>
                    </div>

                    <div className="metric-card highlight-card">
                        <div className="metric-icon">🎯</div>
                        <div className="metric-content">
                            <p className="metric-label">All-Time Sales</p>
                            <p className="metric-value">GHS {parseFloat(performance.sales_metrics?.all_time?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="metric-sub">{performance.sales_metrics?.all_time?.total_transactions || 0} total payments recorded</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Highlights Grid */}
            <div className="metrics-section">
                <h3>👥 {isManager ? 'Branch Customer Intelligence' : 'Customer Metrics'}</h3>
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon">👤</div>
                        <div className="metric-content">
                            <p className="metric-label">Total Customers</p>
                            <p className="metric-value">{performance.customer_metrics?.total_customers || 0}</p>
                            <p className="metric-sub">{isManager ? 'In manager branch' : 'Assigned to worker'}</p>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">✅</div>
                        <div className="metric-content">
                            <p className="metric-label">Active Customers</p>
                            <p className="metric-value">{performance.customer_metrics?.active_customers || 0}</p>
                            <p className="metric-sub">{performance.customer_metrics?.retention_rate || 0}% active retention</p>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">🎉</div>
                        <div className="metric-content">
                            <p className="metric-label">Completed Cards</p>
                            <p className="metric-value">{performance.customer_metrics?.completed_customers || 0}</p>
                            <p className="metric-sub">{performance.customer_metrics?.completion_rate || 0}% card completion</p>
                        </div>
                    </div>

                    <div className="metric-card">
                        <div className="metric-icon">💳</div>
                        <div className="metric-content">
                            <p className="metric-label">Avg Payment Size</p>
                            <p className="metric-value">GHS {parseFloat(performance.sales_metrics?.all_time?.avg_transaction || 0).toFixed(2)}</p>
                            <p className="metric-sub">Average per collection</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workers Under Management Section (Only for Managers) */}
            {isManager && (
                <div className="workers-management-section">
                    <div className="section-header-row">
                        <div>
                            <h3>👥 Workers Under This Manager ({workers.length})</h3>
                            <p className="section-subtitle">Real-time performance, customer counts, and collection totals for each worker in this branch.</p>
                        </div>
                        {workers.length > 3 && (
                            <div className="search-input-wrapper">
                                <Search size={16} className="search-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Search workers..." 
                                    value={workerSearch}
                                    onChange={e => setWorkerSearch(e.target.value)}
                                    className="worker-search-input"
                                />
                            </div>
                        )}
                    </div>

                    {workers.length === 0 ? (
                        <div className="empty-workers-box">
                            <p>No workers are currently assigned to this branch.</p>
                        </div>
                    ) : filteredWorkers.length === 0 ? (
                        <div className="empty-workers-box">
                            <p>No workers found matching "{workerSearch}".</p>
                        </div>
                    ) : (
                        <div className="workers-table-container">
                            <table className="workers-perf-table">
                                <thead>
                                    <tr>
                                        <th>Worker</th>
                                        <th>Status</th>
                                        <th>Total Customers</th>
                                        <th>Active Customers</th>
                                        <th>Today Sales</th>
                                        <th>This Month Sales</th>
                                        <th>All-Time Sales</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredWorkers.map(w => (
                                        <tr key={w.id}>
                                            <td>
                                                <div className="worker-cell">
                                                    <div className="mini-avatar">
                                                        {w.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="worker-name-title">{w.name}</div>
                                                        <div className="worker-subtext">{w.phone || w.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-pill ${w.status === 'inactive' ? 'inactive' : 'active'}`}>
                                                    {w.status || 'Active'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge-count count-total">
                                                    {w.total_customers}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge-count count-active">
                                                    {w.active_customers}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="sales-highlight today">
                                                    GHS {parseFloat(w.today_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="sales-highlight month">
                                                    GHS {parseFloat(w.this_month_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="sales-highlight alltime">
                                                    GHS {parseFloat(w.all_time_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn-worker-view"
                                                    onClick={() => navigate(`/performance/${w.id}`)}
                                                    title="View this worker's individual performance"
                                                >
                                                    View Performance
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Recent Activity Section */}
            <div className="recent-activity-section">
                <h3>📋 Recent Branch Activity</h3>
                <div className="activity-list">
                    {(!performance.recent_activity || performance.recent_activity.length === 0) ? (
                        <p className="no-activity">No recent collections recorded.</p>
                    ) : (
                        performance.recent_activity.map((activity, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-date">
                                    {new Date(activity.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                                <div className="activity-details">
                                    <p className="activity-customer">
                                        <strong>{activity.customer_name}</strong>
                                        {activity.collector_name && (
                                            <span className="collector-tag">Collected by: {activity.collector_name}</span>
                                        )}
                                    </p>
                                    <p className="activity-amount">
                                        <span className="amount-pill">GHS {parseFloat(activity.amount_paid).toFixed(2)}</span>
                                        <span className="boxes-pill">{activity.boxes_checked} boxes</span>
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Performance;
