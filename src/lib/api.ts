const API_BASE_URL = 'http://localhost:3001/api';

interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    usdtWallet: string;
    isAdmin: boolean;
  };
}

interface ApiError {
  error: string;
}

class ApiClient {
  private getHeaders() {
    const token = AuthStorage.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

// Auth methods
  async register(email: string, username: string, password: string, usdtWallet: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, usdtWallet })
    });

    if (data.token && data.user) {
      AuthStorage.setToken(data.token);
      AuthStorage.setUser(data.user);
    }

    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('token', response.token);
    }
    
    return response;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Tournament methods
  async getTournaments() {
    return this.request('/tournaments');
  }

  async getTournament(id: string) {
    return this.request(`/tournaments/${id}`);
  }

  async joinTournament(id: string, txHash: string) {
    return this.request(`/tournaments/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ txHash })
    });
  }

  async verifyPayment(paymentId: string) {
    return this.request(`/tournaments/payments/${paymentId}/verify`, {
      method: 'PUT'
    });
  }

  async distributePrizes(tournamentId: string) {
    return this.request(`/tournaments/${tournamentId}/distribute`, {
      method: 'POST'
    });
  }

  // Score methods
  async submitScore(value: number) {
    return this.request('/scores/submit', {
      method: 'POST',
      body: JSON.stringify({ value })
    });
  }

  async getGlobalLeaderboard() {
    return this.request('/scores/global');
  }

  // Leaderboard methods
  async getLeaderboard() {
    return this.request('/scores/global');
  }

  async getTournamentLeaderboard(id: string) {
    return this.request(`/leaderboard/tournament/${id}`);
  }

  // User methods
  async getUserProfile(username: string) {
    return this.request(`/users/${username}`);
  }

  async updateProfile(username: string) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ username })
    });
  }
}

export const api = new ApiClient();

// Auth state management
export const useAuth = () => {
  const isAuthenticated = !!AuthStorage.getToken();
  const user = AuthStorage.getUser();

  return {
    isAuthenticated,
    user,
    login: api.login.bind(api),
    register: (email: string, username: string, password: string, usdtWallet: string) => 
      api.register(email, username, password, usdtWallet),
    logout: api.logout.bind(api),
  };
};

// Additional API helpers
// Check if current user has an active registration in any tournament
(ApiClient.prototype as any).hasActiveRegistration = function() {
  return this.request('/tournaments/active-registration');
};

// Admin: get pending payments
(ApiClient.prototype as any).getPendingPayments = function() {
  return this.request('/tournaments/payments/pending');
};