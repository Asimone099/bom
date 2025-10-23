import DatabaseConnection from '../database/connection';
import bcrypt from 'bcrypt';

export interface UserData {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'viewer' | 'manager' | 'admin';
    permissions: string[];
    provider: string;
    google_id?: string;
    created_at: string;
    last_login: string;
    password?: string; // Password hash (opzionale per utenti Google OAuth)
}

export class UserRepository {
    private db = DatabaseConnection.getInstance();

    // Trova utente per email
    async findByEmail(email: string): Promise<UserData | null> {
        try {
            const query = `
                SELECT id, name, email, avatar, role, permissions, provider, google_id, 
                       created_at, last_login, password
                FROM users 
                WHERE email = $1
            `;
            const result = await this.db.query(query, [email]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions || [],
                provider: user.provider,
                google_id: user.google_id,
                created_at: user.created_at,
                last_login: user.last_login,
                password: user.password // CRITICAL: Include password hash for verification
            };
        } catch (error) {
            console.error('Errore nel trovare utente per email:', error);
            return null;
        }
    }

    // Trova utente per nome
    async findByName(name: string): Promise<UserData | null> {
        try {
            const query = `
                SELECT id, name, email, avatar, role, permissions, provider, google_id, 
                       created_at, last_login, password
                FROM users 
                WHERE name = $1
            `;
            const result = await this.db.query(query, [name]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions || [],
                provider: user.provider,
                google_id: user.google_id,
                created_at: user.created_at,
                last_login: user.last_login,
                password: user.password // Include password hash for verification
            };
        } catch (error) {
            console.error('Errore nel trovare utente per nome:', error);
            return null;
        }
    }

    // Trova utente per email o nome
    async findByEmailOrName(emailOrName: string): Promise<UserData | null> {
        try {
            console.log(`🔍 Repository: Searching for user with email/name: ${emailOrName}`);
            
            const query = `
                SELECT id, name, email, avatar, role, permissions, provider, google_id, 
                       created_at, last_login, password
                FROM users 
                WHERE email = $1 OR name = $1
            `;
            const result = await this.db.query(query, [emailOrName]);
            
            console.log(`🔍 Repository: Query executed, found ${result.rows.length} rows`);
            
            if (result.rows.length === 0) {
                console.log(`🔍 Repository: No user found for ${emailOrName}`);
                return null;
            }

            const user = result.rows[0];
            console.log(`🔍 Repository: User found - ID: ${user.id}, Name: ${user.name}, Provider: ${user.provider}, HasPassword: ${!!user.password}`);
            
            return {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions || [],
                provider: user.provider,
                google_id: user.google_id,
                created_at: user.created_at,
                last_login: user.last_login,
                password: user.password // Include password hash for verification
            };
        } catch (error) {
            console.error('🚨 Repository ERROR nel trovare utente per email o nome:', error);
            // CRITICAL: Rilancia l'errore invece di restituire null silenziosamente
            throw new Error(`Database error during user lookup: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Trova utente per Google ID
    async findByGoogleId(googleId: string): Promise<UserData | null> {
        try {
            const query = `
                SELECT id, name, email, avatar, role, permissions, provider, google_id, 
                       created_at, last_login
                FROM users 
                WHERE google_id = $1
            `;
            const result = await this.db.query(query, [googleId]);
            
            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions || [],
                provider: user.provider,
                google_id: user.google_id,
                created_at: user.created_at,
                last_login: user.last_login
            };
        } catch (error) {
            console.error('Errore nel trovare utente per Google ID:', error);
            return null;
        }
    }

    // Crea nuovo utente
    async create(userData: {
        name: string;
        email: string;
        avatar?: string;
        role: 'viewer' | 'manager' | 'admin';
        permissions: string[];
        provider: string;
        google_id?: string;
        password?: string;
    }): Promise<UserData | null> {
        try {
            // Hash password se fornita
            const hashedPassword = userData.password ? await this.hashPassword(userData.password) : null;
            
            const query = `
                INSERT INTO users (name, email, avatar, role, permissions, provider, google_id, password, created_at, last_login)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id, name, email, avatar, role, permissions, provider, google_id, created_at, last_login, password
            `;
            
            const result = await this.db.query(query, [
                userData.name,
                userData.email,
                userData.avatar,
                userData.role,
                userData.permissions,
                userData.provider,
                userData.google_id,
                hashedPassword
            ]);

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions || [],
                provider: user.provider,
                google_id: user.google_id,
                created_at: user.created_at,
                last_login: user.last_login
            };
        } catch (error) {
            console.error('Errore nella creazione utente:', error);
            return null;
        }
    }

    // Aggiorna ultimo login
    async updateLastLogin(email: string, avatar?: string): Promise<UserData | null> {
        try {
            const query = `
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP, avatar = COALESCE($2, avatar)
                WHERE email = $1
                RETURNING id, name, email, avatar, role, permissions, provider, google_id, created_at, last_login
            `;
            
            const result = await this.db.query(query, [email, avatar]);

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions || [],
                provider: user.provider,
                google_id: user.google_id,
                created_at: user.created_at,
                last_login: user.last_login
            };
        } catch (error) {
            console.error('Errore nell\'aggiornamento ultimo login:', error);
            return null;
        }
    }

    // Ottieni tutti gli utenti
    async findAll(): Promise<UserData[]> {
        try {
            const query = `
                SELECT id, name, email, avatar, role, permissions, provider, google_id, 
                       created_at, last_login
                FROM users 
                ORDER BY created_at DESC
            `;
            const result = await this.db.query(query);
            
            return result.rows.map((user: any) => ({
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions || [],
                provider: user.provider,
                google_id: user.google_id,
                created_at: user.created_at,
                last_login: user.last_login
            }));
        } catch (error) {
            console.error('Errore nel recuperare tutti gli utenti:', error);
            return [];
        }
    }

    // Aggiorna ruolo utente
    async updateRole(email: string, role: 'viewer' | 'manager' | 'admin', permissions: string[]): Promise<UserData | null> {
        try {
            const query = `
                UPDATE users 
                SET role = $2, permissions = $3, updated_at = CURRENT_TIMESTAMP
                WHERE email = $1
                RETURNING id, name, email, avatar, role, permissions, provider, google_id, created_at, last_login
            `;
            
            const result = await this.db.query(query, [email, role, permissions]);

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                id: user.id.toString(),
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions || [],
                provider: user.provider,
                google_id: user.google_id,
                created_at: user.created_at,
                last_login: user.last_login
            };
        } catch (error) {
            console.error('Errore nell\'aggiornamento ruolo:', error);
            return null;
        }
    }

    // Elimina utente
    async delete(email: string): Promise<boolean> {
        try {
            const query = 'DELETE FROM users WHERE email = $1';
            const result = await this.db.query(query, [email]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Errore nell\'eliminazione utente:', error);
            return false;
        }
    }

    // Aggiorna Google ID per utente esistente
    async updateGoogleId(email: string, googleId: string): Promise<boolean> {
        try {
            const query = `
                UPDATE users 
                SET google_id = $2, updated_at = CURRENT_TIMESTAMP
                WHERE email = $1
            `;
            const result = await this.db.query(query, [email, googleId]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Errore nell\'aggiornamento Google ID:', error);
            return false;
        }
    }

    // Hash password
    private async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    // Verifica password
    async verifyPassword(email: string, password: string): Promise<boolean> {
        try {
            const query = 'SELECT password FROM users WHERE email = $1';
            const result = await this.db.query(query, [email]);
            
            if (result.rows.length === 0 || !result.rows[0].password) {
                return false; // Utente non trovato o senza password
            }

            return await bcrypt.compare(password, result.rows[0].password);
        } catch (error) {
            console.error('Errore nella verifica password:', error);
            return false;
        }
    }

    // Aggiorna password utente
    async updatePassword(email: string, newPassword: string): Promise<boolean> {
        try {
            const hashedPassword = await this.hashPassword(newPassword);
            const query = `
                UPDATE users 
                SET password = $2, updated_at = CURRENT_TIMESTAMP
                WHERE email = $1
            `;
            const result = await this.db.query(query, [email, hashedPassword]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Errore nell\'aggiornamento password:', error);
            return false;
        }
    }
}