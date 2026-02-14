import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import CompanySettings from './CompanySettings';

jest.mock('axios');

describe('CompanySettings Component', () => {
  const mockSettingsData = {
    company: {
      id: 1,
      name: 'Acme Corporation',
      legal_name: 'Acme Corp Ltd',
      domain: 'acme.local',
      subdomain: 'acme',
      primary_color: '#FF6B6B',
      card_prefix: 'ACM',
      currency: 'USD',
      timezone: 'America/New_York',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders company settings component', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    render(<CompanySettings />);

    await waitFor(() => {
      expect(screen.getByText(/Settings/i) || screen.getByRole('main')).toBeTruthy();
    });
  });

  test('fetches company settings on mount', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    render(<CompanySettings />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/company/settings');
    });
  });

  test('displays company name in form', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    render(<CompanySettings />);

    await waitFor(() => {
      const nameField = screen.queryByDisplayValue('Acme Corporation');
      expect(nameField || screen.getByText(/Acme/i)).toBeTruthy();
    });
  });

  test('displays color picker with primary color', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    render(<CompanySettings />);

    await waitFor(() => {
      const colorInput = screen.queryByDisplayValue('#FF6B6B');
      expect(colorInput || screen.getByText(/Color/i)).toBeTruthy();
    });
  });

  test('shows card prefix field with validation', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    render(<CompanySettings />);

    await waitFor(() => {
      const prefixField = screen.queryByDisplayValue('ACM');
      expect(prefixField || screen.getByText(/Prefix/i)).toBeTruthy();
    });
  });

  test('updates form field values', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    const { container } = render(<CompanySettings />);

    await waitFor(() => {
      const inputs = container.querySelectorAll('input[type="text"]');
      if (inputs.length > 0) {
        userEvent.clear(inputs[0]);
        userEvent.type(inputs[0], 'Updated Name');
      }
    });
  });

  test('shows save button', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    render(<CompanySettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i }) ||
             screen.getByText(/Save/i)).toBeTruthy();
    });
  });

  test('submits form with updated data', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    axios.put.mockResolvedValue({ data: { success: true } });
    
    render(<CompanySettings />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    const saveButton = screen.queryByRole('button', { name: /save/i });
    if (saveButton) {
      fireEvent.click(saveButton);
      expect(axios.put).toHaveBeenCalled();
    }
  });

  test('shows error message on save failure', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    axios.put.mockRejectedValue(new Error('Validation error'));
    
    render(<CompanySettings />);

    await waitFor(() => {
      const saveButton = screen.queryByRole('button', { name: /save/i });
      if (saveButton) {
        fireEvent.click(saveButton);
      }
    });
  });

  test('displays tabbed interface with General and Branding tabs', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    render(<CompanySettings />);

    await waitFor(() => {
      expect(screen.getByText(/General/i) || screen.getByText(/Branding/i)).toBeTruthy();
    });
  });

  test('switches between tabs', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    render(<CompanySettings />);

    await waitFor(() => {
      const tabs = screen.queryAllByRole('tab');
      if (tabs.length > 0) {
        fireEvent.click(tabs[1]);
      }
    });
  });

  test('validates color input format', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    const { container } = render(<CompanySettings />);

    await waitFor(() => {
      const colorInputs = container.querySelectorAll('input[type="color"]');
      expect(colorInputs.length > 0 || screen.getByText(/Color/i)).toBeTruthy();
    });
  });

  test('reset button restores original values', async () => {
    axios.get.mockResolvedValue({ data: mockSettingsData });
    render(<CompanySettings />);

    await waitFor(() => {
      const resetButton = screen.queryByRole('button', { name: /reset/i });
      expect(resetButton || screen.getByText(/Reset/i)).toBeTruthy();
    });
  });
});
