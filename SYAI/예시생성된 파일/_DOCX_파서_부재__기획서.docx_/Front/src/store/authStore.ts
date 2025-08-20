interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

const AUTH_STORAGE_KEY = 'authToken';
const USER_STORAGE_KEY = 'authUser';

const authStore = {
  _state: {
    isAuthenticated: false,
    user: null,
    token: null,
  } as AuthState,

  get isAuthenticated(): boolean {
    return this._state.isAuthenticated;
  },
  get user(): User | null {
    return this._state.user;
  },
  get token(): string | null {
    return this._state.token;
  },

  login(token: string, user: User) {
    this._state.isAuthenticated = true;
    this._state.user = user;
    this._state.token = token;
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },

  logout() {
    this._state.isAuthenticated = false;
    this._state.user = null;
    this._state.token = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  initialize() {
    const storedToken = localStorage.getItem(AUTH_STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this._state.isAuthenticated = true;
        this._state.user = user;
        this._state.token = storedToken;
      } catch (e) {
        this.logout();
      }
    }
  },
};

authStore.initialize();

export default authStore;