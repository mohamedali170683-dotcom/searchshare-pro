/**
 * API Client for SearchShare Pro
 * Handles all communication with the backend server
 */

// API base URL - works with Vercel serverless functions
const API_BASE_URL = '/api';

// Token storage
let authToken = localStorage.getItem('searchshare_token');

/**
 * Set the authentication token
 */
export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('searchshare_token', token);
  } else {
    localStorage.removeItem('searchshare_token');
  }
}

/**
 * Get stored auth token
 */
export function getAuthToken() {
  return authToken;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!authToken;
}

/**
 * Make an API request
 */
async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  // Handle unauthorized responses
  if (response.status === 401) {
    setAuthToken(null);
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

// =============================================
// AUTH API
// =============================================

export const auth = {
  async signup(email, password, name) {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
    setAuthToken(data.token);
    return data;
  },

  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(data.token);
    return data;
  },

  logout() {
    setAuthToken(null);
    window.dispatchEvent(new CustomEvent('auth:logout'));
  },

  async getProfile() {
    return request('/auth/me');
  },

  async updateProfile(data) {
    return request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async changePassword(currentPassword, newPassword) {
    return request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  async updateApiCredentials(apiLogin, apiPassword) {
    return request('/auth/api-credentials', {
      method: 'PUT',
      body: JSON.stringify({ apiLogin, apiPassword })
    });
  }
};

// =============================================
// PROJECTS API
// =============================================

export const projects = {
  async list() {
    const data = await request('/projects');
    return data.projects;
  },

  async get(id) {
    const data = await request(`/projects/${id}`);
    return data.project;
  },

  async create(projectData) {
    const data = await request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
    return data;
  },

  async update(id, projectData) {
    return request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  },

  async delete(id) {
    return request(`/projects/${id}`, {
      method: 'DELETE'
    });
  },

  async createSnapshot(id) {
    const data = await request(`/projects/${id}/snapshot`, {
      method: 'POST'
    });
    return data.snapshot;
  },

  async getRecommendations(id) {
    const data = await request(`/projects/${id}/recommendations`);
    return data.recommendations;
  }
};

// =============================================
// DASHBOARD API
// =============================================

export const dashboard = {
  async getStats() {
    return request('/dashboard/stats');
  }
};

// =============================================
// DATAFORSEO API
// =============================================

export const dataForSeo = {
  async testConnection() {
    try {
      const data = await request('/dataforseo/test', { method: 'POST' });
      return { success: true, balance: data.balance };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async fetchVolumes(keywords, locationCode = 2840) {
    const data = await request('/dataforseo/volumes', {
      method: 'POST',
      body: JSON.stringify({ keywords, locationCode })
    });
    return data.volumes;
  },

  async fetchKeywordSuggestions(seedKeyword, limit = 30, locationCode = 2840) {
    const data = await request('/dataforseo/keyword-suggestions', {
      method: 'POST',
      body: JSON.stringify({ seedKeyword, limit, locationCode })
    });
    return data.keywords;
  },

  async fetchKeywordIdeas(seedKeyword, limit = 30, locationCode = 2840) {
    const data = await request('/dataforseo/keyword-ideas', {
      method: 'POST',
      body: JSON.stringify({ seedKeyword, limit, locationCode })
    });
    return data.keywords;
  },

  async fetchRelatedKeywords(seedKeyword, limit = 20, locationCode = 2840) {
    const data = await request('/dataforseo/related-keywords', {
      method: 'POST',
      body: JSON.stringify({ seedKeyword, limit, locationCode })
    });
    return data.keywords;
  },

  async fetchHistoricalVolumes(keywords, locationCode = 2840) {
    const data = await request('/dataforseo/historical-volumes', {
      method: 'POST',
      body: JSON.stringify({ keywords, locationCode })
    });
    return data.history;
  },

  async fetchSerpPositions(keywords, domains, locationCode = 2840) {
    const data = await request('/dataforseo/serp-positions', {
      method: 'POST',
      body: JSON.stringify({ keywords, domains, locationCode })
    });
    return data;
  }
};

// Export all APIs
export default {
  auth,
  projects,
  dashboard,
  dataForSeo,
  setAuthToken,
  getAuthToken,
  isAuthenticated
};
