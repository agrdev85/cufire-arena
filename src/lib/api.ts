import { AuthStorage } from './auth-storage';

const API_BASE_URL = "http://localhost:4000/api";

interface AuthResponse {
  token: string;
  user: Record<string, unknown>;
}

interface ApiError extends Error {
  status?: number;
  data?: Record<string, unknown>;
}

class ApiClient {
    // Torneos finalizados ocultos (global, persistente en DB)
    async getHiddenFinalizedTournaments() {
      return this.request('/tournaments/hidden-finalized');
    }

    // Ocultar/desocultar todos los finalizados
    async setHideAllFinalized(hidden: boolean) {
      return this.request('/tournaments/hidden-finalized', {
        method: 'POST',
        body: JSON.stringify({ hideAll: true, hidden })
      });
    }

    // Ocultar/desocultar individual
    async setHiddenFinalizedTournament(id: number, hidden: boolean) {
      return this.request('/tournaments/hidden-finalized', {
        method: 'POST',
        body: JSON.stringify({ id, hidden })
      });
    }
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

        // Solo reintentar para errores de servidor, no para errores de cliente (400s)
        if (retryCount < this.maxRetries && response.status >= 500) {
        const error = new Error(message) as ApiError;
        error.status = response.status;
          return this.request(endpoint, options, retryCount + 1);
        }

        const error = new Error(message) as ApiError;
        error.status = response.status;
        error.data = data;
        throw error;
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
    /**
     * Obtiene torneos. Si hideFinalized=true, oculta los finalizados.
     */
    async getTournaments(options: RequestInit = {}, hideFinalized: boolean = true/* , fetchOptions: { signal: AbortSignal; headers: { 'Cache-Control': string; }; } */) {
      const endpoint = `/tournaments?hideFinalized=${hideFinalized ? '1' : '0'}`;
      return this.request(endpoint, options);
    }

    async getTournament(id: string) {
      return this.request(`/tournaments/${id}`);
    }

    async createTournament(tournament: Record<string, unknown>) {
      return this.request('/tournaments', {
        method: 'POST',
        body: JSON.stringify(tournament)
      });
    }

    async updateTournament(id: string, tournament: Record<string, unknown>) {
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
   
    async getUsers(search: string = '', options: RequestInit = {}) {
      const endpoint = '/users' + (search ? `?search=${encodeURIComponent(search)}` : '');
      return this.request(endpoint, options);
    }

    async createUser(user: Record<string, unknown>) {
      return this.request('/users', {
        method: 'POST',
        body: JSON.stringify(user)
      });
    }

    async updateUser(id: string, user: Record<string, unknown>) {
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

    async getUserStats(userId: string) {
      return this.request(`/users/${userId}/stats`);
    }

    // Methods User Profile

   // User methods
  async getUserProfile(username: string) {
    return this.request(`/users/${username}`);
  }

  async updateProfile(userData: { username?: string; usdtWallet?: string }) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUserProfile() {  // NUEVO MÉTODO
    return this.request('/users/profile/delete', {
      method: 'DELETE'
    });
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

    // Testimonials methods
    async getTestimonials() {
      return this.request('/testimonials');
    }

    async submitTestimonial(text: string) {
      return this.request('/testimonials', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
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