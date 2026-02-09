import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { showError } from '../utils/sweetalert';
import '../styles/Performance.css';

function Performance() {
    const { workerId } = useParams();
    const navigate = useNavigate();
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);

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
        if (score >= 80) return { level: 'Excellent', color: '#4CAF50' };
        if (score >= 60) return { level: 'Good', color: '#2196F3' };
        if (score >= 40) return { level: 'Average', color: '#FF9800' };
        return { level: 'Needs Improvement', color: '#F44336' };
    };

    if (loading) {
        return <div className="loading">Loading performance data...</div>;
    }

    if (!performance) {
        return <div className="error">No performance data available</div>;
    }

    const performanceLevel = getPerformanceLevel(performance.performance_score);

    return (
        <div className="performance-page">
            <div className="page-header">
                <button className="btn-back" onClick={() => navigate('/sales')}>
                    ← Back to Sales
                </button>
                <h1>🏆 Worker Performance</h1>
            </div>

            {/* Worker Overview Card */}
            <div className="worker-overview-card">
                <div className="worker-info">
                    <div className="worker-avatar">
                        {performance.worker.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="worker-details">
                        <h2>{performance.worker.name}</h2>
                        <p className="worker-role">{performance.worker.role}</p>
                        <p className="worker-meta">
                            📍 {performance.worker.branch || 'No Branch'} •
                            📅 Joined {new Date(performance.worker.joined_date).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="performance-score-badge" style={{ borderColor: performanceLevel.color }}>
                    <div className="score-circle" style={{ background: `conic-gradient(${performanceLevel.color} ${performance.performance_score * 3.6}deg, #e0e0e0 0deg)` }}>
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

            {/* Score Breakdown */}
            <div className="score-breakdown-section">
                <h3>Performance Breakdown</h3>
                <div className="score-breakdown-grid">
                    <div className="breakdown-item">
                        <div className="breakdown-header">
                            <span className="breakdown-label">Sales Volume</span>
                            <span className="breakdown-score">{performance.score_breakdown.sales_volume.toFixed(1)}/40</span>
                        </div>
                        <div className="breakdown-bar">
                            <div className="breakdown-fill" style={{ width: `${(performance.score_breakdown.sales_volume / 40) * 100}%`, background: '#4CAF50' }}></div>
                        </div>
                    </div>
                    <div className="breakdown-item">
                        <div className="breakdown-header">
                            <span className="breakdown-label">Transaction Frequency</span>
                            <span className="breakdown-score">{performance.score_breakdown.transaction_frequency.toFixed(1)}/20</span>
                        </div>
                        <div className="breakdown-bar">
                            <div className="breakdown-fill" style={{ width: `${(performance.score_breakdown.transaction_frequency / 20) * 100}%`, background: '#2196F3' }}></div>
                        </div>
                    </div>
                    <div className="breakdown-item">
                        <div className="breakdown-header">
                            <span className="breakdown-label">Customer Retention</span>
                            <span className="breakdown-score">{performance.score_breakdown.customer_retention.toFixed(1)}/20</span>
                        </div>
                        <div className="breakdown-bar">
                            <div className="breakdown-fill" style={{ width: `${(performance.score_breakdown.customer_retention / 20) * 100}%`, background: '#FF9800' }}></div>
                        </div>
                    </div>
                    <div className="breakdown-item">
                        <div className="breakdown-header">
                            <span className="breakdown-label">Completion Rate</span>
                            <span className="breakdown-score">{performance.score_breakdown.completion_rate.toFixed(1)}/20</span>
                        </div>
                        <div className="breakdown-bar">
                            <div className="breakdown-fill" style={{ width: `${(performance.score_breakdown.completion_rate / 20) * 100}%`, background: '#9C27B0' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Metrics */}
            <div className="metrics-section">
                <h3>💰 Sales Metrics</h3>
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon">🎯</div>
                        <div className="metric-content">
                            <p className="metric-label">All-Time Sales</p>
                            <p className="metric-value">GHS{parseFloat(performance.sales_metrics.all_time.total_sales).toFixed(2)}</p>
                            <p className="metric-sub">{performance.sales_metrics.all_time.total_transactions} transactions</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">📅</div>
                        <div className="metric-content">
                            <p className="metric-label">This Month</p>
                            <p className="metric-value">GHS{parseFloat(performance.sales_metrics.this_month.total_sales).toFixed(2)}</p>
                            <p className="metric-sub">{performance.sales_metrics.this_month.transactions} transactions</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">📊</div>
                        <div className="metric-content">
                            <p className="metric-label">This Week</p>
                            <p className="metric-value">GHS{parseFloat(performance.sales_metrics.this_week.total_sales).toFixed(2)}</p>
                            <p className="metric-sub">{performance.sales_metrics.this_week.transactions} transactions</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">💵</div>
                        <div className="metric-content">
                            <p className="metric-label">Avg Transaction</p>
                            <p className="metric-value">GHS{parseFloat(performance.sales_metrics.all_time.avg_transaction).toFixed(2)}</p>
                            <p className="metric-sub">per payment</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Metrics */}
            <div className="metrics-section">
                <h3>👥 Customer Metrics</h3>
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-icon">👤</div>
                        <div className="metric-content">
                            <p className="metric-label">Total Customers</p>
                            <p className="metric-value">{performance.customer_metrics.total_customers}</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">✅</div>
                        <div className="metric-content">
                            <p className="metric-label">Active Customers</p>
                            <p className="metric-value">{performance.customer_metrics.active_customers}</p>
                            <p className="metric-sub">{performance.customer_metrics.retention_rate}% retention</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">🎉</div>
                        <div className="metric-content">
                            <p className="metric-label">Completed Cards</p>
                            <p className="metric-value">{performance.customer_metrics.completed_customers}</p>
                            <p className="metric-sub">{performance.customer_metrics.completion_rate}% completion</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity-section">
                <h3>📋 Recent Activity</h3>
                <div className="activity-list">
                    {performance.recent_activity.length === 0 ? (
                        <p className="no-activity">No recent activity</p>
                    ) : (
                        performance.recent_activity.map((activity, index) => (
                            <div key={index} className="activity-item">
                                <div className="activity-date">
                                    {new Date(activity.payment_date).toLocaleDateString()}
                                </div>
                                <div className="activity-details">
                                    <p className="activity-customer">{activity.customer_name}</p>
                                    <p className="activity-amount">GHS{parseFloat(activity.amount_paid).toFixed(2)} • {activity.boxes_checked} boxes</p>
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
