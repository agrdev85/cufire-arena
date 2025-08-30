const API_BASE_URL = 'http://localhost:4000/api';

// Auth storage
export const AuthStorage = {
  getToken: () => localStorage.getItem('cufire_token'),
  setToken: (token: string) => localStorage.setItem('cufire_token', token),
  removeToken: () => localStorage.removeItem('cufire_token'),
  getUser: () => {
    const user = localStorage.getItem('cufire_user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: any) => localStorage.setItem('cufire_user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('cufire_user')
};

// API client with auth
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
  async register(email: string, username: string, password: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password })
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

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    AuthStorage.removeToken();
    AuthStorage.removeUser();
  }

  // Tournament methods
  async getTournaments() {
    return this.request('/tournaments');
  }

  async getTournament(id: string) {
    return this.request(`/tournaments/${id}`);
  }

  async joinTournament(id: string) {
    return this.request(`/tournaments/${id}/join`, {
      method: 'POST'
    });
  }

  async updateTournamentScore(id: string, score: number) {
    return this.request(`/tournaments/${id}/score`, {
      method: 'POST',
      body: JSON.stringify({ score })
    });
  }

  // Leaderboard methods
  async getLeaderboard() {
    return this.request('/leaderboard');
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
    register: api.register.bind(api),
    logout: api.logout.bind(api)
  };
};