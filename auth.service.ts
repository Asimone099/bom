// Servizio di autenticazione
export type UserRole = 'viewer' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  permissions: string[];
  createdAt?: string;
  lastLogin?: string;
  isNewUser?: boolean;
  welcomeMessage?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

class AuthService {
  private readonly STORAGE_KEY = 'bom_user';
  private readonly TOKEN_KEY = 'bom_token';
  private readonly API_BASE: string;

  constructor() {
    // Determina l'URL dell'API basato sull'ambiente
    if (import.meta.env.PROD) {
      this.API_BASE = `${window.location.origin}/api`;
    } else {
      this.API_BASE = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api`
        : 'http://localhost:5001/api';
    }
  }

  // Login Google OAuth reale
  async loginWithGoogle(): Promise<User> {
    try {
      // 1. Ottieni URL di autorizzazione Google dal backend
      const urlResponse = await fetch(`${this.API_BASE}/auth/google/url`);
      
      if (!urlResponse.ok) {
        const errorData = await urlResponse.json();
        if (errorData.error === 'Google OAuth non configurato') {
          throw new Error(`🔧 ${errorData.message}\n\n📖 ${errorData.setupGuide}`);
        }
        throw new Error(errorData.error || 'Errore durante la configurazione Google OAuth');
      }
      
      const { authUrl } = await urlResponse.json();

      // 2. Apri popup per l'autorizzazione Google
      const code = await this.openGoogleAuthPopup(authUrl);

      // 3. Invia il codice al backend per ottenere i dati utente
      const response = await fetch(`${this.API_BASE}/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante l\'autenticazione Google');
      }

      const { user, token, isNewUser, message } = await response.json();
      
      // 4. Salva utente e token
      this.saveUser(user);
      this.saveToken(token);
      
      // 5. Aggiungi informazioni sul tipo di accesso
      user.isNewUser = isNewUser;
      user.welcomeMessage = message;
      
      return user;
    } catch (error) {
      console.error('Errore login Google:', error);
      throw error;
    }
  }

  // Apre popup per Google OAuth
  private openGoogleAuthPopup(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        authUrl,
        'google-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        reject(new Error('Popup bloccato dal browser. Abilita i popup per questo sito.'));
        return;
      }

      // Monitora il popup per il codice di autorizzazione
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          reject(new Error('Login annullato dall\'utente'));
          return;
        }

        try {
          // Controlla se il popup è stato reindirizzato alla callback
          if (popup.location.href.includes('/auth/callback')) {
            const url = new URL(popup.location.href);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            popup.close();
            clearInterval(checkClosed);

            if (error) {
              reject(new Error(`Errore Google OAuth: ${error}`));
            } else if (code) {
              resolve(code);
            } else {
              reject(new Error('Codice di autorizzazione non ricevuto'));
            }
          }
        } catch (e) {
          // Errore cross-origin normale durante il processo OAuth
        }
      }, 1000);

      // Timeout dopo 5 minuti
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
          clearInterval(checkClosed);
          reject(new Error('Timeout durante l\'autenticazione'));
        }
      }, 300000);
    });
  }

  // Login con email e password
  async loginWithEmail(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Credenziali non valide');
      }

      const { user, token } = await response.json();
      
      this.saveUser(user);
      this.saveToken(token);
      
      return user;
    } catch (error) {
      console.error('Errore login email:', error);
      throw error;
    }
  }

  // Registrazione nuovo utente
  async registerUser(userData: { name: string; email: string; password: string }): Promise<User> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante la registrazione');
      }

      const { user, token } = await response.json();
      
      this.saveUser(user);
      this.saveToken(token);
      
      return user;
    } catch (error) {
      console.error('Errore registrazione:', error);
      throw error;
    }
  }

  // Logout
  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
  }

  // Salva utente nel localStorage
  private saveUser(user: User): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  // Salva token JWT
  private saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  // Recupera token JWT
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Recupera utente dal localStorage
  getCurrentUser(): User | null {
    const userData = localStorage.getItem(this.STORAGE_KEY);
    if (!userData) return null;
    
    try {
      const user = JSON.parse(userData);
      
      // Migrazione dati vecchi - aggiungi campi mancanti
      if (!user.role) {
        user.role = 'viewer'; // Default role
        user.permissions = ['read'];
        user.createdAt = new Date().toISOString();
        user.lastLogin = new Date().toISOString();
        
        // Salva i dati aggiornati
        this.saveUser(user);
      }
      
      // Debug: controlla se lastLogin è valido
      if (user.lastLogin && isNaN(new Date(user.lastLogin).getTime())) {
        console.warn('Invalid lastLogin date detected:', user.lastLogin);
        user.lastLogin = new Date().toISOString();
        this.saveUser(user);
      }
      
      return user;
    } catch (error) {
      console.error('Errore parsing user data:', error);
      // Se i dati sono corrotti, pulisci
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  // Verifica se l'utente è autenticato
  isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    const token = this.getToken();
    return user !== null && token !== null;
  }

  // Verifica token con il backend
  async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await fetch(`${this.API_BASE}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result.valid;
    } catch (error) {
      console.error('Errore verifica token:', error);
      return false;
    }
  }

  // Aggiorna profilo utente
  updateProfile(updates: Partial<User>): Promise<User> {
    return new Promise((resolve, reject) => {
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        const updatedUser = { ...currentUser, ...updates };
        this.saveUser(updatedUser);
        resolve(updatedUser);
      } else {
        reject(new Error('Utente non autenticato'));
      }
    });
  }

  // Verifica se l'utente ha un permesso specifico
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.permissions.includes(permission) : false;
  }

  // Verifica se l'utente ha un ruolo specifico
  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  // Verifica se l'utente può modificare (manager o admin)
  canEdit(): boolean {
    return this.hasRole('manager') || this.hasRole('admin');
  }

  // Verifica se l'utente può eliminare (manager o admin)
  canDelete(): boolean {
    return this.hasRole('manager') || this.hasRole('admin');
  }

  // Verifica se l'utente è admin
  isAdmin(): boolean {
    return this.hasRole('admin');
  }
}

export const authService = new AuthService();