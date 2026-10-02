import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    CheckCircle, 
    Share2, 
    Copy, 
    RefreshCw, 
    Calendar, 
    Clock, 
    User, 
    Phone, 
    MapPin, 
    ShieldCheck, 
    CreditCard, 
    TrendingUp,
    ExternalLink
} from 'lucide-react';
import '../styles/PublicPassbook.css';

function PublicPassbook() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (token) {
            fetchPassbook();
        }
    }, [token]);

    const fetchPassbook = async () => {
        try {
            setLoading(true);
            setError(null);
            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${apiUrl}/public/passbook/${token}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('This digital passbook link is invalid or has expired.');
                }
                throw new Error('Unable to load passbook details. Please try again later.');
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            console.error('Passbook fetch error:', err);
            setError(err.message || 'Error loading passbook.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleShareWhatsApp = () => {
        const companyName = data?.company?.name || 'Contribution Manager';
        const customerName = data?.customer?.name || 'Customer';
        const cardName = data?.card?.card_name || 'Contribution Card';
        const text = `Hello ${customerName}, here is your live digital passbook for ${cardName} at ${companyName}: ${window.location.href}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) {
        return (
            <div className="passbook-loading-container">
                <div className="passbook-spinner"></div>
                <h2>Loading Your Digital Passbook...</h2>
                <p>Verifying secure connection with system</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="passbook-error-container">
                <div className="error-card">
                    <div className="error-icon">⚠️</div>
                    <h2>Passbook Not Found</h2>
                    <p>{error || 'The requested customer passbook could not be found.'}</p>
                    <button className="btn-retry" onClick={fetchPassbook}>
                        <RefreshCw size={16} /> Try Again
                    </button>
                </div>
            </div>
        );
    }

    const { company, customer, card, box_states = [], payments = [] } = data;

    // Calculate box coloring (alternating groups by payment_id or checked_date)
    const paymentIds = [...new Set(box_states
        .filter(b => b.is_checked && b.payment_id)
        .map(b => b.payment_id)
    )].sort((a, b) => a - b);

    const checkedDates = [...new Set(box_states
        .filter(b => b.is_checked && !b.payment_id && b.checked_date)
        .map(b => b.checked_date)
    )].sort();

    return (
        <div className="public-passbook-page">
            {/* Top Navigation / Company Header */}
            <header className="passbook-header">
                <div className="passbook-header-content">
                    <div className="company-brand">
                        {company?.logo_url ? (
                            <img src={company.logo_url} alt={company.name} className="company-logo" />
                        ) : (
                            <div className="company-logo-placeholder">
                                {(company?.name || 'C').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="company-text">
                            <h1>{company?.name || 'Contribution Manager'}</h1>
                            <span className="verified-badge">
                                <ShieldCheck size={14} /> Official Verified Passbook
                            </span>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button 
                            className="btn-action-pill copy-btn"
                            onClick={handleCopyLink}
                            title="Copy link"
                        >
                            <Copy size={15} />
                            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                        <button 
                            className="btn-action-pill whatsapp-btn"
                            onClick={handleShareWhatsApp}
                            title="Share on WhatsApp"
                        >
                            <Share2 size={15} />
                            <span>WhatsApp</span>
                        </button>
                        <button 
                            className="btn-action-icon"
                            onClick={fetchPassbook}
                            title="Refresh data"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="passbook-main-container">
                {/* Customer Greeting Card */}
                <div className="customer-hero-card">
                    <div className="hero-profile">
                        <div className="avatar-circle">
                            {customer?.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="hero-details">
                            <h2>{customer?.name}</h2>
                            <div className="hero-meta">
                                {customer?.phone && (
                                    <span><Phone size={13} /> {customer.phone}</span>
                                )}
                                {customer?.location && (
                                    <span><MapPin size={13} /> {customer.location}</span>
                                )}
                                {customer?.branch_name && (
                                    <span>🏢 {customer.branch_name}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="hero-status">
                        <span className={`status-pill ${customer?.status || 'in_progress'}`}>
                            {customer?.status?.replace('_', ' ').toUpperCase() || 'IN PROGRESS'}
                        </span>
                        {customer?.is_served && (
                            <span className="status-pill served">
                                ✓ FULFILLED / SERVED
                            </span>
                        )}
                    </div>

                    {/* Start Date & Due Date Timeline */}
                    <div className="hero-timeline-row">
                        <div className="timeline-item start">
                            <span className="timeline-icon">📅</span>
                            <div className="timeline-info">
                                <span className="timeline-label">START DATE</span>
                                <strong className="timeline-value">
                                    {customer?.start_date ? new Date(customer.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not specified'}
                                </strong>
                            </div>
                        </div>

                        <div className="timeline-arrow">➔</div>

                        <div className="timeline-item due">
                            <span className="timeline-icon">⏰</span>
                            <div className="timeline-info">
                                <span className="timeline-label">DUE / MATURITY DATE</span>
                                <strong className="timeline-value">
                                    {customer?.due_date ? new Date(customer.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not specified'}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Card Statistics */}
                {card ? (
                    <>
                        <div className="card-kpi-grid">
                            <div className="kpi-card highlight-gold">
                                <span className="kpi-label">TOTAL SAVED</span>
                                <span className="kpi-value">
                                    GHS {parseFloat(card.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="kpi-sub">
                                    {card.boxes_checked} of {card.total_boxes} boxes paid
                                </span>
                            </div>

                            <div className="kpi-card">
                                <span className="kpi-label">TARGET AMOUNT</span>
                                <span className="kpi-value">
                                    GHS {parseFloat(card.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="kpi-sub">
                                    GHS {parseFloat(card.box_price || 0).toFixed(2)} per box
                                </span>
                            </div>

                            <div className="kpi-card">
                                <span className="kpi-label">REMAINING BALANCE</span>
                                <span className="kpi-value">
                                    GHS {parseFloat(card.amount_remaining || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="kpi-sub">
                                    {card.boxes_remaining} boxes left to complete
                                </span>
                            </div>

                            <div className="kpi-card">
                                <span className="kpi-label">COMPLETION</span>
                                <span className="kpi-value">
                                    {card.completion_percentage}%
                                </span>
                                <span className="kpi-sub">
                                    {card.card_name}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="progress-container-card">
                            <div className="progress-header-row">
                                <span className="progress-title">
                                    <TrendingUp size={16} /> Progress to Goal
                                </span>
                                <span className="progress-pct">{card.completion_percentage}% Completed</span>
                            </div>
                            <div className="progress-bar-track">
                                <div 
                                    className="progress-bar-fill" 
                                    style={{ width: `${Math.min(card.completion_percentage || 0, 100)}%` }}
                                ></div>
                            </div>
                            <div className="progress-footer-row">
                                <span>{card.boxes_checked} boxes checked</span>
                                <span>{card.boxes_remaining} remaining</span>
                            </div>
                        </div>

                        {/* Digital Contribution Grid */}
                        <section className="passbook-section card-box-section">
                            <div className="section-header">
                                <div>
                                    <h3>📋 Digital Contribution Card</h3>
                                    <p>Visual map of your physical contribution card</p>
                                </div>
                                <div className="grid-legend">
                                    <span className="legend-item"><span className="dot dot-paid-blue"></span> Deposit A</span>
                                    <span className="legend-item"><span className="dot dot-paid-red"></span> Deposit B</span>
                                    <span className="legend-item"><span className="dot dot-unpaid"></span> Remaining</span>
                                </div>
                            </div>

                            <div className="box-grid">
                                {box_states.map(box => {
                                    let colorClass = 'box-unpaid';
                                    if (box.is_checked) {
                                        if (box.payment_id) {
                                            const index = paymentIds.indexOf(box.payment_id);
                                            colorClass = index % 2 === 0 ? 'box-paid-red' : 'box-paid-blue';
                                        } else if (box.checked_date) {
                                            const dateIndex = checkedDates.indexOf(box.checked_date);
                                            colorClass = dateIndex % 2 === 0 ? 'box-paid-red' : 'box-paid-blue';
                                        } else {
                                            colorClass = 'box-paid-blue';
                                        }
                                    }

                                    return (
                                        <div
                                            key={box.id}
                                            className={`grid-box ${colorClass}`}
                                            title={box.is_checked ? `Box #${box.box_number} • Paid on ${box.checked_date || 'N/A'}` : `Box #${box.box_number} • Remaining`}
                                        >
                                            <span className="box-num">{box.box_number}</span>
                                            {box.is_checked && <span className="box-check">✓</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="no-card-card">
                        <CreditCard size={36} />
                        <h3>No Active Card Assigned</h3>
                        <p>You currently do not have an active savings card assigned.</p>
                    </div>
                )}

                {/* Payment History Timeline */}
                <section className="passbook-section">
                    <div className="section-header">
                        <div>
                            <h3>📜 Deposit History</h3>
                            <p>Real-time record of all your confirmed contributions</p>
                        </div>
                        <span className="records-count">{payments.length} transactions</span>
                    </div>

                    {payments.length === 0 ? (
                        <div className="empty-history">
                            <p>No deposit records found yet.</p>
                        </div>
                    ) : (
                        <div className="payments-list">
                            {payments.map((p, idx) => (
                                <div key={p.id || idx} className="payment-item-card">
                                    <div className="payment-left">
                                        <div className="payment-icon">
                                            <CheckCircle size={18} />
                                        </div>
                                        <div className="payment-info">
                                            <div className="payment-date-row">
                                                <span className="payment-date">
                                                    <Calendar size={13} /> {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Confirmed'}
                                                </span>
                                                {p.payment_time && (
                                                    <span className="payment-time">
                                                        <Clock size={12} /> {p.payment_time}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="payment-details-row">
                                                <span className="method-tag">
                                                    {(p.payment_method || 'Cash').toUpperCase()}
                                                </span>
                                                {p.boxes_checked > 0 && (
                                                    <span className="boxes-checked-tag">
                                                        +{p.boxes_checked} {p.boxes_checked === 1 ? 'Box' : 'Boxes'}
                                                    </span>
                                                )}
                                                {p.worker_name && (
                                                    <span className="worker-tag">
                                                        Collector: {p.worker_name}
                                                    </span>
                                                )}
                                            </div>
                                            {p.notes && (
                                                <p className="payment-notes">"{p.notes}"</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="payment-right">
                                        <span className="payment-amount">
                                            +GHS {parseFloat(p.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="confirmed-tag">CONFIRMED</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Footer Assurance & Branding */}
                <footer className="passbook-footer">
                    <p className="security-notice">
                        🔒 <strong>Real-time Security Guarantee:</strong> This passbook is generated live from {company?.name}'s central database. Each box and payment is timestamped and verified.
                    </p>
                    {company?.phone && (
                        <p className="contact-notice">
                            Questions or disputes? Contact customer support: <strong>{company.phone}</strong>
                        </p>
                    )}
                    <div className="footer-credits">
                        Powered by <span>{company?.name || 'Neziz Contribution Manager'}</span>
                    </div>
                </footer>
            </main>
        </div>
    );
}

export default PublicPassbook;
