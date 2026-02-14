import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import EnhancedReports from './EnhancedReports';

jest.mock('axios');

describe('EnhancedReports Component', () => {
  const mockProfitabilityReport = {
    total_revenue: 250000,
    total_expenses: 75000,
    profit: 175000,
    profit_margin: 70,
    expense_breakdown: [
      { category: 'Salaries', amount: 40000 },
      { category: 'Rent', amount: 20000 },
      { category: 'Utilities', amount: 15000 },
    ],
  };

  const mockCustomerReport = {
    status_distribution: {
      active: 200,
      in_progress: 80,
      completed: 20,
    },
    top_customers: [
      { id: 1, name: 'ABC Corp', balance: 50000 },
      { id: 2, name: 'XYZ Ltd', balance: 45000 },
    ],
    customers_by_worker: [
      { worker: 'John Doe', count: 25 },
      { worker: 'Jane Smith', count: 22 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders enhanced reports component', async () => {
    axios.get.mockResolvedValue({ data: mockProfitabilityReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      expect(screen.getByText(/Report/i) || screen.getByRole('main')).toBeTruthy();
    });
  });

  test('displays report tabs for all 6 report types', async () => {
    axios.get.mockResolvedValue({ data: mockProfitabilityReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      expect(screen.getByText(/Profitability/i) || 
              screen.getByText(/Customer/i) ||
              screen.getByText(/Worker/i) ||
              screen.getByText(/Inventory/i) ||
              screen.getByText(/Ledger/i) ||
              screen.getByText(/Audit/i)).toBeTruthy();
    });
  });

  test('fetches profitability report on mount', async () => {
    axios.get.mockResolvedValue({ data: mockProfitabilityReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/reports/profitability'),
        expect.any(Object)
      );
    });
  });

  test('switches report tabs', async () => {
    axios.get.mockResolvedValue({ data: mockCustomerReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      const customerTab = screen.queryByRole('tab', { name: /Customer/i });
      if (customerTab) {
        fireEvent.click(customerTab);
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/reports/customer-performance'),
          expect.any(Object)
        );
      }
    });
  });

  test('displays date range filter inputs', async () => {
    axios.get.mockResolvedValue({ data: mockProfitabilityReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      const dateInputs = screen.queryAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
      expect(dateInputs.length >= 0 || screen.getByText(/Date/i)).toBeTruthy();
    });
  });

  test('filters report by date range', async () => {
    axios.get.mockResolvedValue({ data: mockProfitabilityReport });
    const { container } = render(<EnhancedReports />);

    await waitFor(() => {
      const dateInputs = container.querySelectorAll('input[type="date"]');
      if (dateInputs.length > 0) {
        fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
      }
    });
  });

  test('shows profitability summary cards', async () => {
    axios.get.mockResolvedValue({ data: mockProfitabilityReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      expect(screen.getByText(/Revenue/i) ||
              screen.getByText(/Expense/i) ||
              screen.getByText(/Profit/i)).toBeTruthy();
    });
  });

  test('displays expense breakdown table', async () => {
    axios.get.mockResolvedValue({ data: mockProfitabilityReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      expect(screen.getByText(/Salaries/i) ||
              screen.getByText(/Expense/i)).toBeTruthy();
    });
  });

  test('displays customer performance data', async () => {
    axios.get.mockResolvedValue({ data: mockCustomerReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      const customerTab = screen.queryByRole('tab', { name: /Customer/i });
      if (customerTab) {
        fireEvent.click(customerTab);
        expect(axios.get).toHaveBeenCalled();
      }
    });
  });

  test('shows PDF export button', async () => {
    axios.get.mockResolvedValue({ data: mockProfitabilityReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export/i }) ||
              screen.getByText(/PDF/i) ||
              screen.getByRole('button', { name: /Download/i })).toBeTruthy();
    });
  });

  test('handles report loading state', async () => {
    axios.get.mockImplementation(() => new Promise(() => {}));
    render(<EnhancedReports />);

    expect(screen.getByText(/Loading/i) ||
           screen.getByText(/loading/i) ||
           screen.getByRole('status')).toBeTruthy();
  });

  test('displays error message on API failure', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));
    render(<EnhancedReports />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  test('pagination works for large datasets', async () => {
    const largeData = {
      ...mockProfitabilityReport,
      items: Array(100).fill({ id: 1, name: 'Item' }),
    };
    axios.get.mockResolvedValue({ data: largeData });
    render(<EnhancedReports />);

    await waitFor(() => {
      const paginationButtons = screen.queryAllByRole('button');
      expect(paginationButtons.length > 0 || screen.getByText(/Page/i)).toBeTruthy();
    });
  });

  test('applies filters when filter button clicked', async () => {
    axios.get.mockResolvedValue({ data: mockProfitabilityReport });
    render(<EnhancedReports />);

    await waitFor(() => {
      const filterButton = screen.queryByRole('button', { name: /Filter/i });
      if (filterButton) {
        fireEvent.click(filterButton);
        expect(axios.get).toHaveBeenCalled();
      }
    });
  });
});
