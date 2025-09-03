import { AuthStorage } from './auth-storage';

const API_BASE_URL = 'http://localhost:4000/api';

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
      body: JSON.stringify({ email, password })
    });

    if (data.token && data.user) {
      AuthStorage.setToken(data.token);
      AuthStorage.setUser(data.user);
    }

    return data;
  }

  logout() {
    AuthStorage.clear();
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

  // Additional methods
  async hasActiveRegistration() {
    return this.request('/tournaments/active-registration');
  }

  async getPayments(params?: { status?: 'pending' | 'verified' | 'all'; search?: string }) {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'all') qs.set('status', params.status);
    if (params?.search && params.search.trim()) qs.set('search', params.search.trim());
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request(`/tournaments/payments${suffix}`);
  }

  // Backwards-compatible helper
  async getPendingPayments() {
    return this.getPayments({ status: 'pending' });
  }

  async createTournament(tournament: any) {
    return this.request('/tournaments', {
      method: 'POST',
      body: JSON.stringify(tournament)
    });
  }

  async updateTournament(id: string, tournament: any) {
    return this.request(`/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tournament)
    });
  }

  async deleteTournament(id: string) {
    return this.request(`/tournaments/${id}`, {
      method: 'DELETE'
    });
  }

  async getUsers(search?: string) {
    const qs = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return this.request(`/tournaments/users${qs}`);
  }

  async createUser(user: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  }

  async updateUser(id: string, user: any) {
    return this.request(`/tournaments/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    });
  }

  async deleteUser(id: string) {
    return this.request(`/tournaments/users/${id}`, {
      method: 'DELETE'
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