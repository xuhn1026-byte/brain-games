/**
 * Brain Games Auth Module
 * 简单的姓名 + PIN 登录，状态保存在 localStorage
 */
const AUTH_KEY = 'brainUser';

const auth = {
  getUser() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem(AUTH_KEY);
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  async login(name, pin) {
    const user = await window.BrainAPI.login(name, pin);
    this.setUser(user);
    return user;
  },

  logout() {
    this.clearUser();
  },

  renderUserPill(container) {
    const user = this.getUser();
    if (!container) return;

    if (user) {
      container.innerHTML = `
        <div class="user-pill">
          <span>👤 ${user.name}</span>
          <button class="user-menu-btn" onclick="BrainAuth.toggleMenu()">▼</button>
          <div class="user-menu" id="user-menu" style="display:none;">
            <a href="admin.html?admin=1">数据后台</a>
            <a href="#" onclick="BrainAuth.logout(); location.reload();">退出登录</a>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button class="btn-login-nav" onclick="BrainAuth.showLoginModal()">登录</button>
      `;
    }
  },

  toggleMenu() {
    const menu = document.getElementById('user-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  },

  showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.style.display = 'flex';
  },

  hideLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.style.display = 'none';
  }
};

window.BrainAuth = auth;
