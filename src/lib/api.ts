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
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth
  async register(userData: { username: string; email: string; password: string; usdtWallet: string }) {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response;
  }

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      this.token = response.token;
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Tournaments
  async getTournaments() {
    const response = await this.makeRequest('/tournaments');
    return response;
  }

  async getTournament(id: string) {
    const response = await this.makeRequest(`/tournaments/${id}`);
    return response;
  }

  async joinTournament(id: string, txHash: string) {
    const response = await this.makeRequest(`/tournaments/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    });
    return response;
  }

  async checkActiveRegistration() {
    const response = await this.makeRequest('/tournaments/active-registration');
    return response;
  }

  // Scores
  async getGlobalScores() {
    const response = await this.makeRequest('/scores/global');
    return response;
  }

  async submitScore(score: number) {
    const response = await this.makeRequest('/scores/submit', {
      method: 'POST',
      body: JSON.stringify({ value: score }),
    });
    return response;
  }

  // Admin functions
  async getPayments(search?: string, status?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    
    const response = await this.makeRequest(`/tournaments/payments?${params.toString()}`);
    return response;
  }

  async verifyPayment(paymentId: string) {
    const response = await this.makeRequest(`/tournaments/payments/${paymentId}/verify`, {
      method: 'PUT'
    });
    return response;
  }

  async distributePrizes(tournamentId: string) {
    const response = await this.makeRequest(`/tournaments/${tournamentId}/distribute`, {
      method: 'POST'
    });
    return response;
  }

  // Tournament CRUD
  async createTournament(data: any) {
    const response = await this.makeRequest('/tournaments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response;
  }

  async updateTournament(id: string, data: any) {
    const response = await this.makeRequest(`/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response;
  }

  async deleteTournament(id: string) {
    const response = await this.makeRequest(`/tournaments/${id}`, {
      method: 'DELETE'
    });
    return response;
  }

  // User management
  async getUsers(search?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    
    const response = await this.makeRequest(`/tournaments/users?${params.toString()}`);
    return response;
  }

  async updateUser(id: string, data: any) {
    const response = await this.makeRequest(`/tournaments/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response;
  }

  async deleteUser(id: string) {
    const response = await this.makeRequest(`/tournaments/users/${id}`, {
      method: 'DELETE'
    });
    return response;
  }
}

export const api = new ApiClient();

// Auth hook
export const useAuth = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  return {
    isAuthenticated: !!token,
    user,
    token
  };
};