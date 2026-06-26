/**
 * Brain Games Backend API Client
 * 本地开发默认调用 http://127.0.0.1:3001
 * 部署到腾讯云 CloudBase 后，把下面的地址改成云函数地址
 */
const API_BASE = window.__BRAIN_API_BASE__ || 'http://127.0.0.1:3001';

const api = {
  base: API_BASE,

  async request(method, path, body) {
    const url = `${API_BASE}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(data.error || `请求失败 (${res.status})`);
        error.status = res.status;
        error.data = data;
        throw error;
      }
      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('无法连接后端服务器，请确认后端已启动');
      }
      throw err;
    }
  },

  // Users
  login(name, pin) {
    return this.request('POST', '/api/login', { name, pin });
  },

  getUsers() {
    return this.request('GET', '/api/users');
  },

  // Sessions
  saveSession(payload) {
    return this.request('POST', '/api/sessions', payload);
  },

  getSessions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/api/sessions${qs ? '?' + qs : ''}`);
  },

  getTrials(sessionId) {
    return this.request('GET', `/api/sessions/${sessionId}/trials`);
  },

  deleteSession(sessionId) {
    return this.request('DELETE', `/api/sessions/${sessionId}`);
  },

  health() {
    return this.request('GET', '/api/health');
  }
};

window.BrainAPI = api;
