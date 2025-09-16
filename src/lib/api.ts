import { AuthStorage } from './auth-storage';

const API_BASE_URL = "http://localhost:4000/api";

interface AuthResponse {
  token: string;
  user: any;
}

class ApiClient {
    private lastRequest: number = 0;
    private minRequestInterval: number = 1000; // 1 segundo entre solicitudes
    private maxRetries: number = 3;

    private getHeaders() {
      const token = AuthStorage.getToken();
      return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      };
    }

    private async sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async request(endpoint: string, options: RequestInit = {}, retryCount = 0) {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await this.sleep(this.minRequestInterval - timeSinceLastRequest);
      }
      this.lastRequest = Date.now();

      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`Making API request to: ${url}`, { 
        method: options.method || 'GET',
        headers: options.headers
      });
      
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        let data;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            message = data.error || data.message || message;
            console.error('API Error:', { status: response.status, data });
          } else {
            const text = await response.text();
            console.error('API Error (non-JSON):', { status: response.status, text });
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
        }

        // Retry on certain status codes
        if (retryCount < this.maxRetries && (response.status === 429 || response.status >= 500)) {
          console.warn(`Request failed with ${response.status}, retrying... (attempt ${retryCount + 1}/${this.maxRetries})`);
          await this.sleep(Math.pow(2, retryCount) * 1000); // Exponential backoff
          return this.request(endpoint, options, retryCount + 1);
        }

        throw new Error(message);
      }

      // Handle empty/non-JSON responses safely
      if (response.status === 204) return {};
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return await response.text();
      }

      return response.json();
    }

    // Score & leaderboard methods
    async submitScore(value: number) {
      return this.request('/scores/submit', {
        method: 'POST',
        body: JSON.stringify({ value })
      });
    }

    async getGlobalLeaderboard() {
      return this.request('/scores/leaderboard/global');
    }

    async getTournamentLeaderboard(tournamentId: string) {
      return this.request(`/scores/leaderboard/tournament/${tournamentId}`);
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
    async getTournaments(options: RequestInit = {}) {
      return this.request('/tournaments', options);
    }

    async getTournament(id: string) {
      return this.request(`/tournaments/${id}`);
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

    async joinTournament(id: string, txHash: string) {
      return this.request(`/tournaments/${id}/join`, {
        method: 'POST',
        body: JSON.stringify({ txHash })
      });
    }

    async verifyPayment(paymentId: string) {
      return this.request(`/payments/${paymentId}/verify`, {
        method: 'PUT'
      });
    }

    async distributePrizes(tournamentId: string) {
      return this.request(`/tournaments/${tournamentId}/distribute`, {
        method: 'POST'
      });
    }

    // User methods
    async getUserProfile(username: string) {
      return this.request(`/users/${username}`);
    }

    async getUsers(search: string = '', options: RequestInit = {}) {
      const endpoint = '/users' + (search ? `?search=${encodeURIComponent(search)}` : '');
      return this.request(endpoint, options);
    }

    async createUser(user: any) {
      return this.request('/users', {
        method: 'POST',
        body: JSON.stringify(user)
      });
    }

    async updateUser(id: string, user: any) {
      return this.request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(user)
      });
    }

    async deleteUser(id: string) {
      return this.request(`/users/${id}`, {
        method: 'DELETE'
      });
    }

    async updateProfile(userData: { username?: string; usdtWallet?: string }) {
      return this.request('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
    }

    async getUserStats(userId: string) {
      return this.request(`/users/${userId}/stats`);
    }

    // Payment methods
    async getPayments(params: { status: string; search: string }, options: RequestInit = {}) {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.search) searchParams.set("search", params.search);
    const endpoint = `/payments${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return this.request(endpoint, options);
    }

    // Additional methods
    async hasActiveRegistration() {
      return this.request('/tournaments/active-registration');
    }

    // Backwards-compatible helper
    async getPendingPayments() {
      return this.getPayments({ status: 'pending', search: '' });
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