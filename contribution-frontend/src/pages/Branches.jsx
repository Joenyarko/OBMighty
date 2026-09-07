import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { branchAPI } from '../services/api';
import { showError, showSuccess, showConfirm } from '../utils/sweetalert';
import { useAuth } from '../context/AuthContext';
import { Building, Users, DollarSign, Calendar, TrendingUp, Award, Trash2, Eye, X, Phone, MapPin } from 'lucide-react';
import '../styles/App.css';

function Branches() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedBranchPerf, setSelectedBranchPerf] = useState(null);
    const [perfLoading, setPerfLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        phone: '',
        status: 'active'
    });

    const { isCEO, isSecretary, isManager, isSuperAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const response = await branchAPI.getAll();
            setBranches(response.data || []);
        } catch (error) {
            console.error('Failed to fetch branches', error);
            showError('Failed to load branches.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPerformance = async (branch) => {
        try {
            setPerfLoading(true);
            setSelectedBranchPerf({ branch, loading: true });
            const response = await branchAPI.getPerformance(branch.id);
            setSelectedBranchPerf(response.data);
        } catch (error) {
            console.error('Failed to fetch branch performance', error);
            showError('Failed to load branch performance.');
            setSelectedBranchPerf(null);
        } finally {
            setPerfLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await branchAPI.create(formData);
            setShowModal(false);
            setFormData({ name: '', code: '', address: '', phone: '', status: 'active' });
            fetchBranches();
            showSuccess('Branch created successfully');
        } catch (error) {
            console.error('Failed to create branch', error);
            showError(error.response?.data?.message || 'Error creating branch');
        }
    };

    const handleDelete = async (id, branchName) => {
        const result = await showConfirm(
            `Delete Branch "${branchName}"?`,
            'This action cannot be undone. Branches with existing users or customers cannot be deleted.',
            'Yes, Delete',
            'Cancel'
        );

        if (result.isConfirmed) {
            try {
                await branchAPI.delete(id);
                showSuccess('Branch deleted successfully');
                fetchBranches();
            } catch (error) {
                console.error('Error deleting branch:', error);
                showError(error.response?.data?.message || 'Failed to delete branch.');
            }
        }
    };

    const totalCompanyBranches = branches.length;
    const totalTodayRevenue = branches.reduce((sum, b) => sum + (parseFloat(b.today_revenue) || 0), 0);
    const totalMonthRevenue = branches.reduce((sum, b) => sum + (parseFloat(b.month_revenue) || 0), 0);
    const totalAllTimeRevenue = branches.reduce((sum, b) => sum + (parseFloat(b.all_time_revenue) || 0), 0);
    const totalCustomersCount = branches.reduce((sum, b) => sum + (parseInt(b.customers_count) || 0), 0);

    return (
        <div className="branches-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ color: 'var(--primary-color)', margin: '0 0 6px 0', fontSize: '26px' }}>
                        🏢 Branch Management & Performance
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                        Real-time intelligence and collection performance across all company branches
                    </p>
                </div>
                {(isCEO || isSuperAdmin) && (
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        + Add New Branch
                    </button>
                )}
            </div>

            {/* Performance Summary Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div style={{ background: 'var(--card-bg)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Branches</span>
                    <h3 style={{ fontSize: '24px', margin: '6px 0 0 0', color: '#fff' }}>{totalCompanyBranches}</h3>
                </div>
                <div style={{ background: 'var(--card-bg)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Today's Network Collections</span>
                    <h3 style={{ fontSize: '24px', margin: '6px 0 0 0', color: '#38bdf8' }}>
                        GHS {totalTodayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                </div>
                <div style={{ background: 'var(--card-bg)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>This Month's Collections</span>
                    <h3 style={{ fontSize: '24px', margin: '6px 0 0 0', color: '#34d399' }}>
                        GHS {totalMonthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                </div>
                <div style={{ background: 'var(--card-bg)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>All-Time Network Sales</span>
                    <h3 style={{ fontSize: '24px', margin: '6px 0 0 0', color: '#fbbf24' }}>
                        GHS {totalAllTimeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                </div>
            </div>

            {loading ? (
                <div className="loading" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading branches...</div>
            ) : (
                <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                    {branches.map(branch => (
                        <div key={branch.id} className="card" style={{
                            background: 'var(--card-bg)',
                            padding: '24px',
                            borderRadius: '14px',
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ color: 'var(--primary-color)', margin: '0 0 4px 0', fontSize: '20px' }}>{branch.name}</h3>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                                            Code: {branch.code}
                                        </span>
                                    </div>
                                    <span style={{
                                        background: branch.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: branch.status === 'active' ? '#10b981' : '#ef4444',
                                        border: `1px solid ${branch.status === 'active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        textTransform: 'capitalize'
                                    }}>
                                        {branch.status || 'Active'}
                                    </span>
                                </div>

                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                                    📍 {branch.address || 'No address specified'}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '18px' }}>
                                    📞 {branch.phone || 'No phone number'}
                                </div>

                                {/* Performance Highlights Box */}
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                                        <div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Today's Sales</span>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
                                                GHS {parseFloat(branch.today_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>This Month</span>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#34d399' }}>
                                                GHS {parseFloat(branch.month_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                                        <div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>All-Time Sales</span>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
                                                GHS {parseFloat(branch.all_time_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Payments</span>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                                                {branch.total_payments_count || branch.payments_count || 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                                    <span>👥 {branch.active_workers_count || branch.users_count || 0} Active Staff</span>
                                    <span>👤 {branch.active_customers || 0} Active Customers</span>
                                    {branch.served_customers > 0 && (
                                        <span style={{ color: '#10b981' }}>🎁 {branch.served_customers} Served</span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className="btn-secondary"
                                        style={{ 
                                            flex: 1, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '6px',
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            background: 'rgba(0, 223, 162, 0.12)',
                                            color: 'var(--primary-color)',
                                            border: '1px solid rgba(0, 223, 162, 0.3)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
                                        onClick={() => handleOpenPerformance(branch)}
                                    >
                                        <Award size={16} /> Branch Performance
                                    </button>

                                    {(isCEO || isSuperAdmin) && (
                                        <button 
                                            onClick={() => handleDelete(branch.id, branch.name)}
                                            style={{ 
                                                background: 'rgba(239, 68, 68, 0.12)', 
                                                border: '1px solid rgba(239, 68, 68, 0.3)', 
                                                color: '#ef4444', 
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '8px 12px'
                                            }}
                                            title="Delete Branch"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {branches.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '60px' }}>
                            No branches found. Create your first branch to get started.
                        </div>
                    )}
                </div>
            )}

            {/* Create Branch Modal */}
            {showModal && (
                <div className="custom-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="custom-modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>Create New Branch</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Branch Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="e.g. Accra Central"
                                />
                            </div>
                            <div className="form-group">
                                <label>Branch Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    placeholder="e.g. ACC-01"
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="e.g. 0244123456"
                                />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="e.g. Off High Street, Near Post Office"
                                ></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Branch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detailed Branch Performance Modal */}
            {selectedBranchPerf && (
                <div className="custom-modal-overlay" onClick={() => setSelectedBranchPerf(null)}>
                    <div 
                        className="custom-modal-content" 
                        onClick={e => e.stopPropagation()} 
                        style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <div>
                                <h2 style={{ color: 'var(--primary-color)', margin: '0 0 4px 0', fontSize: '22px' }}>
                                    🏆 {selectedBranchPerf.branch?.name} Performance Intelligence
                                </h2>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Code: {selectedBranchPerf.branch?.code} • {selectedBranchPerf.branch?.address || 'No Address'}
                                </span>
                            </div>
                            <button 
                                onClick={() => setSelectedBranchPerf(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Performance Highlights */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Today's Sales</span>
                                <h4 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#38bdf8' }}>
                                    GHS {parseFloat(selectedBranchPerf.sales_metrics?.today?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h4>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedBranchPerf.sales_metrics?.today?.transactions || 0} payments</span>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>This Week</span>
                                <h4 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#818cf8' }}>
                                    GHS {parseFloat(selectedBranchPerf.sales_metrics?.this_week?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h4>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedBranchPerf.sales_metrics?.this_week?.transactions || 0} payments</span>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>This Month</span>
                                <h4 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#34d399' }}>
                                    GHS {parseFloat(selectedBranchPerf.sales_metrics?.this_month?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h4>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedBranchPerf.sales_metrics?.this_month?.transactions || 0} payments</span>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>All-Time Sales</span>
                                <h4 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#fbbf24' }}>
                                    GHS {parseFloat(selectedBranchPerf.sales_metrics?.all_time?.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h4>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedBranchPerf.sales_metrics?.all_time?.total_transactions || 0} total payments</span>
                            </div>
                        </div>

                        {/* Customer Breakdown */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '15px' }}>👥 Branch Customer Status</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Customers</span>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{selectedBranchPerf.customer_metrics?.total_customers || 0}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active In Progress</span>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#60a5fa' }}>{selectedBranchPerf.customer_metrics?.active_customers || 0}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Completed Cards</span>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fbbf24' }}>{selectedBranchPerf.customer_metrics?.completed_customers || 0}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fulfilled & Served</span>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{selectedBranchPerf.customer_metrics?.served_customers || 0}</div>
                                </div>
                            </div>
                        </div>

                        {/* Workers in this branch */}
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '15px' }}>
                                👷 Workers in this Branch ({(selectedBranchPerf.workers || []).length})
                            </h4>
                            {(!selectedBranchPerf.workers || selectedBranchPerf.workers.length === 0) ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No workers assigned to this branch yet.</p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '8px 10px' }}>Worker</th>
                                                <th style={{ padding: '8px 10px' }}>Status</th>
                                                <th style={{ padding: '8px 10px' }}>Customers</th>
                                                <th style={{ padding: '8px 10px' }}>This Month</th>
                                                <th style={{ padding: '8px 10px' }}>All Time</th>
                                                <th style={{ padding: '8px 10px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedBranchPerf.workers.map(w => (
                                                <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '10px' }}>
                                                        <div style={{ fontWeight: 600, color: '#fff' }}>{w.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{w.phone || w.email}</div>
                                                    </td>
                                                    <td style={{ padding: '10px' }}>
                                                        <span style={{ 
                                                            fontSize: '11px', 
                                                            padding: '2px 6px', 
                                                            borderRadius: '4px',
                                                            background: w.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                            color: w.status === 'active' ? '#10b981' : '#ef4444'
                                                        }}>
                                                            {w.status || 'Active'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px', fontWeight: 600 }}>{w.customers_count || 0}</td>
                                                    <td style={{ padding: '10px', color: '#34d399', fontWeight: 600 }}>
                                                        GHS {parseFloat(w.month_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px', color: '#fbbf24', fontWeight: 600 }}>
                                                        GHS {parseFloat(w.all_time_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '10px' }}>
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedBranchPerf(null);
                                                                navigate(`/performance/${w.id}`);
                                                            }}
                                                            style={{
                                                                padding: '4px 10px',
                                                                background: 'rgba(59, 130, 246, 0.12)',
                                                                color: '#60a5fa',
                                                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                                                borderRadius: '6px',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer'
                                                            }}
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

                        {/* Recent Payments Stream */}
                        <div>
                            <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '15px' }}>📋 Recent Branch Payments</h4>
                            {(!selectedBranchPerf.recent_payments || selectedBranchPerf.recent_payments.length === 0) ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No recent payments in this branch.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {selectedBranchPerf.recent_payments.map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
                                            <div>
                                                <strong style={{ color: '#fff' }}>{p.customer_name}</strong>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                                    Collected by: {p.collector_name || 'Worker'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ color: '#10b981', fontWeight: 700 }}>
                                                    GHS {parseFloat(p.amount_paid).toFixed(2)}
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                                    {new Date(p.payment_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Branches;
