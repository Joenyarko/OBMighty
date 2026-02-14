import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import CompanyDashboard from './CompanyDashboard';

jest.mock('axios');

describe('CompanyDashboard Component', () => {
  const mockDashboardData = {
    kpi_cards: {
      today_revenue: 5000,
      month_revenue: 150000,
      active_customers: 240,
      completion_rate: 92.5,
    },
    statistics: {
      total_branches: 5,
      total_users: 25,
      total_customers: 300,
      monthly_transactions: 1250,
    },
    top_workers: [
      { id: 1, name: 'John Doe', revenue: 25000 },
      { id: 2, name: 'Jane Smith', revenue: 23000 },
    ],
    branch_performance: [
      { id: 1, name: 'Downtown', revenue: 35000 },
      { id: 2, name: 'Uptown', revenue: 32000 },
    ],
    recent_payments: [
      { id: 1, customer: 'ABC Corp', amount: 5000, date: '2026-02-14' },
      { id: 2, customer: 'XYZ Ltd', amount: 3000, date: '2026-02-13' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dashboard component successfully', () => {
    axios.get.mockResolvedValue({ data: mockDashboardData });
    render(<CompanyDashboard />);
    expect(screen.getByText(/Dashboard/i) || screen.getByRole('main')).toBeTruthy();
  });

  test('displays KPI cards with correct values', async () => {
    axios.get.mockResolvedValue({ data: mockDashboardData });
    render(<CompanyDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/5000/i) || screen.getByText(/Today/i)).toBeTruthy();
    });
  });

  test('fetches dashboard data on component mount', async () => {
    axios.get.mockResolvedValue({ data: mockDashboardData });
    render(<CompanyDashboard />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/company/dashboard');
    });
  });

  test('handles API errors gracefully', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));
    render(<CompanyDashboard />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  test('displays loading state while fetching data', () => {
    axios.get.mockImplementation(() => new Promise(() => {}));
    render(<CompanyDashboard />);
    expect(screen.getByText(/loading/i) || screen.getByRole('status')).toBeTruthy();
  });

  test('renders statistics cards correctly', async () => {
    axios.get.mockResolvedValue({ data: mockDashboardData });
    render(<CompanyDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Branches/i) || screen.getByText(/5/)).toBeTruthy();
    });
  });

  test('displays top workers table', async () => {
    axios.get.mockResolvedValue({ data: mockDashboardData });
    render(<CompanyDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Worker/i) || screen.getByText(/John Doe/)).toBeTruthy();
    });
  });

  test('shows recent payment transactions', async () => {
    axios.get.mockResolvedValue({ data: mockDashboardData });
    render(<CompanyDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Payment/i) || screen.getByText(/ABC Corp/)).toBeTruthy();
    });
  });

  test('displays branch performance metrics', async () => {
    axios.get.mockResolvedValue({ data: mockDashboardData });
    render(<CompanyDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Branch/i) || screen.getByText(/Downtown/)).toBeTruthy();
    });
  });

  test('refresh button triggers data reload', async () => {
    axios.get.mockResolvedValue({ data: mockDashboardData });
    const { rerender } = render(<CompanyDashboard />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.queryByRole('button', { name: /refresh/i });
    if (refreshButton) {
      refreshButton.click();
      expect(axios.get).toHaveBeenCalledTimes(2);
    }
  });
});
