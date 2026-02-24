import { useState, useEffect } from 'react';
import { cardSummaryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showError } from '../utils/sweetalert';
import { ArrowLeft, Users, CreditCard, TrendingUp } from 'lucide-react';
import '../styles/CardSummary.css';

function CardSummary() {
    const { isCEO, user } = useAuth();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCard, setSelectedCard] = useState(null);
    const [cardDetail, setCardDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            setLoading(true);
            const response = await cardSummaryAPI.getAll();
            setCards(response.data.cards || []);
        } catch (error) {
            console.error('Failed to fetch card summary:', error);
            showError('Failed to load card summary');
        } finally {
            setLoading(false);
        }
    };

    const handleCardClick = async (card) => {
        setSelectedCard(card);
        setPage(1);
        await fetchCardDetail(card.id, 1);
    };

    const fetchCardDetail = async (cardId, currentPage) => {
        try {
            setDetailLoading(true);
            const response = await cardSummaryAPI.getOne(cardId, { page: currentPage, per_page: 50 });
            setCardDetail(response.data);
        } catch (error) {
            console.error('Failed to fetch card detail:', error);
            showError('Failed to load card details');
        } finally {
            setDetailLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchCardDetail(selectedCard.id, newPage);
    };

    const handleBack = () => {
        setSelectedCard(null);
        setCardDetail(null);
    };

    if (loading) return <div className="loading">Loading card summary...</div>;

    // Detail view
    if (selectedCard && cardDetail) {
        return (
            <div className="card-summary-page">
                <div className="detail-header">
                    <button className="back-btn" onClick={handleBack}>
                        <ArrowLeft size={20} />
                        <span>Back to Cards</span>
                    </button>
                </div>

                {/* Card Info Banner */}
                <div className="card-info-banner">
                    {selectedCard.front_image_url && (
                        <img
                            src={selectedCard.front_image_url}
                            alt={selectedCard.card_name}
                            className="banner-card-image"
                        />
                    )}
                    <div className="banner-details">
                        <h2>{cardDetail.card?.card_name}</h2>
                        <div className="banner-stats">
                            <span className="banner-stat">
                                <CreditCard size={16} />
                                {cardDetail.card?.number_of_boxes} boxes
                            </span>
                            <span className="banner-stat">
                                <TrendingUp size={16} />
                                GHS {parseFloat(cardDetail.card?.amount || 0).toFixed(2)}
                            </span>
                            <span className="banner-stat">
                                <Users size={16} />
                                {selectedCard.total_customers} customers
                            </span>
                        </div>
                    </div>
                </div>

                {/* CEO: Worker Breakdown */}
                {cardDetail.worker_breakdown && cardDetail.worker_breakdown.length > 0 && (
                    <div className="worker-breakdown-section">
                        <h3>Worker Breakdown</h3>
                        <div className="worker-breakdown-grid">
                            {cardDetail.worker_breakdown.map((worker) => (
                                <div key={worker.worker_id} className="worker-breakdown-card">
                                    <div className="wbc-header">
                                        <div className="wbc-avatar">{worker.worker_name.charAt(0)}</div>
                                        <div className="wbc-name">{worker.worker_name}</div>
                                    </div>
                                    <div className="wbc-stats">
                                        <div className="wbc-stat">
                                            <span className="wbc-stat-value">{worker.total_customers}</span>
                                            <span className="wbc-stat-label">Customers</span>
                                        </div>
                                        <div className="wbc-stat">
                                            <span className="wbc-stat-value">{worker.in_progress}</span>
                                            <span className="wbc-stat-label">Active</span>
                                        </div>
                                        <div className="wbc-stat">
                                            <span className="wbc-stat-value">{worker.completed}</span>
                                            <span className="wbc-stat-label">Done</span>
                                        </div>
                                        <div className="wbc-stat">
                                            <span className="wbc-stat-value">GHS {worker.total_collected}</span>
                                            <span className="wbc-stat-label">Collected</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Customer Table */}
                <div className="customers-table-section">
                    <h3>Customers ({cardDetail.customers?.total || 0})</h3>
                    {detailLoading ? (
                        <div className="loading">Loading...</div>
                    ) : cardDetail.customers?.data?.length > 0 ? (
                        <>
                            <div className="table-container">
                                <table className="customers-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Location</th>
                                            {isCEO && <th>Worker</th>}
                                            <th>Progress</th>
                                            <th>Paid</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cardDetail.customers.data.map((customer) => (
                                            <tr key={customer.id}>
                                                <td className="customer-name">{customer.name}</td>
                                                <td>{customer.location || '-'}</td>
                                                {isCEO && <td>{customer.worker?.name || '-'}</td>}
                                                <td>
                                                    <div className="progress-cell">
                                                        <div className="mini-progress-bar">
                                                            <div
                                                                className="mini-progress-fill"
                                                                style={{ width: `${customer.total_boxes > 0 ? (customer.boxes_filled / customer.total_boxes) * 100 : 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="progress-text">{customer.boxes_filled}/{customer.total_boxes}</span>
                                                    </div>
                                                </td>
                                                <td className="amount-cell">GHS {parseFloat(customer.amount_paid || 0).toFixed(2)}</td>
                                                <td>
                                                    <span className={`status-badge ${customer.status}`}>
                                                        {customer.status === 'in_progress' ? 'Active' : customer.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {cardDetail.customers.last_page > 1 && (
                                <div className="pagination">
                                    <button
                                        disabled={page <= 1}
                                        onClick={() => handlePageChange(page - 1)}
                                    >Previous</button>
                                    <span>Page {page} of {cardDetail.customers.last_page}</span>
                                    <button
                                        disabled={page >= cardDetail.customers.last_page}
                                        onClick={() => handlePageChange(page + 1)}
                                    >Next</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-data">No customers issued this card yet</div>
                    )}
                </div>
            </div>
        );
    }

    // Grid view
    return (
        <div className="card-summary-page">
            <div className="page-header">
                <h1>Card Summary</h1>
                <p className="page-subtitle">Overview of all card categories and customer distribution</p>
            </div>

            {cards.length === 0 ? (
                <div className="no-data">No cards available</div>
            ) : (
                <div className="cards-overview-grid">
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            className="card-overview-item"
                            onClick={() => handleCardClick(card)}
                        >
                            <div className="card-image-wrapper">
                                {card.front_image_url ? (
                                    <img
                                        src={card.front_image_url}
                                        alt={card.card_name}
                                        className="card-front-image"
                                    />
                                ) : (
                                    <div className="card-placeholder">
                                        <CreditCard size={48} />
                                    </div>
                                )}
                            </div>
                            <div className="card-overview-info">
                                <h3>{card.card_name}</h3>
                                <div className="card-meta">
                                    <span>{card.number_of_boxes} boxes</span>
                                    <span>GHS {parseFloat(card.amount).toFixed(2)}</span>
                                </div>
                                <div className="card-customer-stats">
                                    <div className="ccs-item total">
                                        <Users size={14} />
                                        <span>{card.total_customers} customers</span>
                                    </div>
                                    <div className="ccs-row">
                                        <span className="ccs-active">{card.in_progress} active</span>
                                        <span className="ccs-completed">{card.completed} done</span>
                                    </div>
                                </div>
                                <div className="card-revenue">
                                    GHS {card.total_revenue.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default CardSummary;
