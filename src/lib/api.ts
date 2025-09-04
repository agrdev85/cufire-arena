import { AuthStorage } from './auth-storage';

const API_BASE_URL = "/api";

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
      let message = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        message = data.error || data.message || message;
      } catch {
        // ignore parse error
      }
      throw new Error(message);
    }

    // Handle empty/non-JSON responses safely
    if (response.status === 204) return {};
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      try { return JSON.parse(text); } catch { return {}; }
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
    const res = await fetch(`${API_BASE_URL}/tournaments`, {
      credentials: "include",
    });
    return res.json();
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
    const res = await fetch(`${API_BASE_URL}/tournaments/payments/${paymentId}/verify`, {
      method: "PUT",
      credentials: "include",
    });
    return res.json();
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

  async getPayments(params: { status: string; search: string }) {
    const url = new URL(`${API_BASE_URL}/tournaments/payments`);
    url.searchParams.set("status", params.status);
    url.searchParams.set("search", params.search);
    const res = await fetch(url.toString(), {
      credentials: "include",
    });
    return res.json();
  }

  // Backwards-compatible helper
  async getPendingPayments() {
    return this.getPayments({ status: 'pending', search: '' });
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

  async getUsers(search: string) {
    const url = new URL(`${API_BASE_URL}/tournaments/users`);
    url.searchParams.set("search", search);
    const res = await fetch(url.toString(), {
      credentials: "include",
    });
    return res.json();
  }

  async createUser(user: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  }

  async updateUser(id: string, user: any) {
    const res = await fetch(`${API_BASE_URL}/tournaments/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(user),
    });
    return res.json();
  }

  async deleteUser(id: string) {
    const res = await fetch(`${API_BASE_URL}/tournaments/users/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.json();
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