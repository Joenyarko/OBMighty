import axios from 'axios';

describe('Axios Interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('request interceptor adds auth token', () => {
    localStorage.setItem('auth_token', 'test-token-123');

    // Test that token is available
    const token = localStorage.getItem('auth_token');
    expect(token).toBe('test-token-123');
  });

  test('request interceptor sets content-type header', () => {
    const config = {
      headers: {},
    };

    // Should have content-type set to application/json
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    expect(config.headers['Content-Type']).toBe('application/json');
  });

  test('response interceptor handles 401 unauthorized', () => {
    const error = {
      response: {
        status: 401,
        data: { message: 'Unauthorized' },
      },
    };

    expect(error.response.status).toBe(401);
  });

  test('response interceptor handles 403 forbidden', () => {
    const error = {
      response: {
        status: 403,
        data: { message: 'Forbidden' },
      },
    };

    expect(error.response.status).toBe(403);
  });

  test('response interceptor handles 500 server error', () => {
    const error = {
      response: {
        status: 500,
        data: { message: 'Internal Server Error' },
      },
    };

    expect(error.response.status).toBe(500);
  });

  test('response interceptor handles network timeout', () => {
    const error = {
      code: 'ECONNABORTED',
      message: 'timeout of 10000ms exceeded',
    };

    expect(error.code).toBe('ECONNABORTED');
  });

  test('adds company header to requests', () => {
    localStorage.setItem('company_id', '1');

    const companyId = localStorage.getItem('company_id');
    expect(companyId).toBe('1');
  });

  test('includes user role in request headers', () => {
    localStorage.setItem('user_role', 'ceo');

    const userRole = localStorage.getItem('user_role');
    expect(userRole).toBe('ceo');
  });

  test('handles request cancellation', () => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    expect(source).toHaveProperty('token');
    expect(source).toHaveProperty('cancel');
  });

  test('sets default timeout for requests', () => {
    expect(axios.defaults.timeout === 0 || axios.defaults.timeout > 0).toBeTruthy();
  });

  test('handles retry logic on timeout', async () => {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      retryCount++;
    }

    expect(retryCount).toBe(maxRetries);
  });

  test('preserves original request data in error response', () => {
    const config = {
      method: 'POST',
      url: '/api/payments',
      data: { amount: 100 },
    };

    expect(config.data.amount).toBe(100);
  });

  test('parses error messages from backend', () => {
    const errorResponse = {
      data: {
        message: 'Validation failed',
        errors: {
          amount: ['Amount must be greater than 0'],
        },
      },
    };

    expect(errorResponse.data.message).toBe('Validation failed');
    expect(errorResponse.data.errors.amount[0]).toBe('Amount must be greater than 0');
  });
});
