import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserRepository, UserData } from '../repositories/user.repository';
import DatabaseConnection from '../database/connection';

const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture?: string;
    verified_email: boolean;
}

type UserRole = 'viewer' | 'manager' | 'admin';

// Repository per gestire gli utenti nel database
const userRepository = new UserRepository();

// Funzione per ottenere permessi per ruolo
const getRolePermissions = (role: UserRole): string[] => {
    switch (role) {
        case 'admin':
            return ['read', 'write', 'delete', 'manage_users', 'system_settings', 'export', 'import'];
        case 'manager':
            return ['read', 'write', 'delete', 'export', 'import'];
        case 'viewer':
            return ['read'];
        default:
            return ['read'];
    }
};

// Funzione per ottenere o creare utente nel database
const getOrCreateUser = async (googleUser: GoogleUser): Promise<{ user: UserData; isNewUser: boolean }> => {
    // Cerca utente esistente per email o Google ID
    let user = await userRepository.findByEmail(googleUser.email) ||
        await userRepository.findByGoogleId(googleUser.id);

    let isNewUser = false;

    if (!user) {
        // Nuovo utente - assegna ruolo basato su email
        isNewUser = true;
        const defaultRole: UserRole =
            googleUser.email === 'a.simone@powerflex.it' ? 'admin' :
                googleUser.email === 'g.bejenaru.powerflex@gmail.com' ? 'manager' : 'viewer';
        const permissions = getRolePermissions(defaultRole);

        user = await userRepository.create({
            name: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.picture,
            role: defaultRole,
            permissions,
            provider: 'google',
            google_id: googleUser.id
        });

        if (!user) {
            throw new Error('Errore nella creazione dell\'utente');
        }
    } else {
        // Utente esistente - mantieni il nome del database, aggiorna solo login e avatar
        // NON sovrascrivere il nome con quello di Google se l'utente esiste già
        user = await userRepository.updateLastLogin(googleUser.email, googleUser.picture);
        if (!user) {
            throw new Error('Errore nell\'aggiornamento dell\'utente');
        }
        
        // Se l'utente non ha google_id, aggiungilo per future ricerche
        if (!user.google_id) {
            await userRepository.updateGoogleId(user.email, googleUser.id);
        }
    }

    return { user, isNewUser };
};

export class AuthController {
    // Genera URL di autorizzazione Google
    static getGoogleAuthUrl(req: Request, res: Response) {
        try {
            // Controlla se le credenziali Google sono configurate
            if (!process.env.GOOGLE_CLIENT_ID ||
                process.env.GOOGLE_CLIENT_ID === 'demo-client-id.apps.googleusercontent.com') {
                return res.status(400).json({
                    error: 'Google OAuth non configurato',
                    message: 'Configura GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET in backend/.env',
                    setupGuide: 'Leggi GOOGLE-OAUTH-SETUP-RAPIDO.md per la configurazione'
                });
            }

            const scopes = [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ];

            const authUrl = client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes,
                prompt: 'consent'
            });

            res.json({ authUrl });
        } catch (error) {
            console.error('Errore generazione URL Google:', error);
            res.status(500).json({
                error: 'Errore interno del server',
                details: error instanceof Error ? error.message : 'Errore sconosciuto'
            });
        }
    }

    // Gestisce il callback di Google OAuth
    static async handleGoogleCallback(req: Request, res: Response) {
        try {
            const { code } = req.body;

            if (!code) {
                return res.status(400).json({ error: 'Codice di autorizzazione mancante' });
            }

            // Scambia il codice con i token
            const { tokens } = await client.getToken(code);
            client.setCredentials(tokens);

            // Ottieni informazioni utente da Google
            const ticket = await client.verifyIdToken({
                idToken: tokens.id_token!,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();

            if (!payload) {
                return res.status(400).json({ error: 'Token Google non valido' });
            }

            const googleUser: GoogleUser = {
                id: payload.sub,
                email: payload.email!,
                name: payload.name!,
                picture: payload.picture,
                verified_email: payload.email_verified || false
            };

            // Ottieni o crea utente con ruoli
            const { user: userData, isNewUser } = await getOrCreateUser(googleUser);

            // Genera JWT per l'app con ruoli
            const jwtToken = jwt.sign(
                {
                    id: userData.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role,
                    permissions: userData.permissions,
                    provider: 'google'
                },
                process.env.JWT_SECRET || 'bom-app-secret',
                { expiresIn: '7d' }
            );

            // Mappa i campi dal formato database al formato frontend
            const frontendUser = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                avatar: userData.avatar,
                role: userData.role,
                permissions: userData.permissions,
                provider: userData.provider,
                createdAt: userData.created_at,
                lastLogin: userData.last_login
            };

            // Restituisci i dati utente completi con informazione se è nuovo
            res.json({
                success: true,
                user: frontendUser,
                token: jwtToken,
                isNewUser: isNewUser,
                message: isNewUser
                    ? `Benvenuto nel sistema BOM, ${frontendUser.name}! Account creato con successo.`
                    : `Bentornato, ${frontendUser.name}!`
            });

        } catch (error) {
            console.error('Errore callback Google:', error);
            res.status(400).json({
                error: 'Errore durante l\'autenticazione con Google',
                details: error instanceof Error ? error.message : 'Errore sconosciuto'
            });
        }
    }

    // Verifica token JWT
    static async verifyToken(req: Request, res: Response) {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Token mancante' });
            }

            const token = authHeader.substring(7);

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bom-app-secret') as any;

            res.json({
                valid: true,
                user: {
                    id: decoded.id,
                    name: decoded.name,
                    email: decoded.email,
                    role: decoded.role,
                    permissions: decoded.permissions,
                    provider: decoded.provider
                }
            });

        } catch (error) {
            res.status(401).json({
                valid: false,
                error: 'Token non valido'
            });
        }
    }

    // Login demo rimosso per sicurezza

    // Login con email - TUTTI GLI UTENTI REGISTRATI
    static async loginWithEmail(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            console.log(`🔐 LOGIN ATTEMPT: ${email} at ${new Date().toISOString()}`);

            if (!email || !password) {
                return res.status(401).json({ error: 'Email e password richiesti' });
            }

            // Verifica connessione database
            const db = DatabaseConnection.getInstance();
            const isDbConnected = await db.testConnection();
            
            if (!isDbConnected) {
                console.error('❌ Database non connesso');
                return res.status(503).json({
                    error: 'Servizio temporaneamente non disponibile',
                    details: 'Database non connesso'
                });
            }

            // Cerca utente nel database
            console.log(`🔍 Searching for user: ${email}`);
            let user;
            
            try {
                user = await userRepository.findByEmailOrName(email);
                console.log(`🔍 User search result: ${user ? `Found ${user.name}` : 'Not found'}`);
            } catch (dbError) {
                console.error(`❌ Database error: ${dbError}`);
                return res.status(503).json({
                    error: 'Errore del database'
                });
            }

            // Se utente non esiste, nega accesso
            if (!user) {
                console.log(`❌ User not found: ${email}`);
                return res.status(401).json({
                    error: 'Credenziali non valide'
                });
            }

            console.log(`✅ User found: ${user.name} (${user.email})`);

            // Verifica password
            if (!user.password) {
                console.log(`❌ No password set for user: ${email}`);
                return res.status(401).json({
                    error: 'Credenziali non valide'
                });
            }

            console.log(`🔐 Verifying password for: ${email}`);
            
            const isPasswordValid = await bcrypt.compare(password, user.password);
            console.log(`🔐 Password check result: ${isPasswordValid ? 'VALID' : 'INVALID'}`);
            
            if (!isPasswordValid) {
                console.log(`❌ Invalid password for: ${email}`);
                return res.status(401).json({
                    error: 'Credenziali non valide'
                });
            }

            console.log(`✅ Login successful for: ${user.name} (${user.email})`);

            // Aggiorna ultimo login
            try {
                const updatedUser = await userRepository.updateLastLogin(user.email);
                if (updatedUser) {
                    user = updatedUser;
                }
            } catch (updateError) {
                console.error(`❌ Error updating last login: ${updateError}`);
            }

            // Genera JWT token
            const jwtToken = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions,
                    provider: user.provider
                },
                process.env.JWT_SECRET || 'bom-app-secret',
                { expiresIn: '7d' }
            );

            console.log(`🎉 JWT GENERATED: Token created for ${user.email} - Role: ${user.role}`);

            // Mappa i campi dal formato database al formato frontend
            const frontendUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions,
                provider: user.provider,
                createdAt: user.created_at,
                lastLogin: user.last_login
            };

            res.json({
                success: true,
                user: frontendUser,
                token: jwtToken,
                message: `Bentornato, ${user.name}!`
            });

        } catch (error) {
            console.error('🚨 CRITICAL ERROR in loginWithEmail:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }

    // Ottieni lista utenti (solo admin)
    static async getAllUsers(req: Request, res: Response) {
        try {
            // Verifica che l'utente sia admin (in produzione usare middleware)
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ error: 'Token mancante' });
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bom-app-secret') as any;

            if (decoded.role !== 'admin') {
                return res.status(403).json({ error: 'Accesso negato. Solo admin.' });
            }

            const users = await userRepository.findAll();
            
            // Mappa i campi dal formato database al formato frontend
            const frontendUsers = users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                permissions: user.permissions,
                provider: user.provider,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }));
            
            res.json({ users: frontendUsers });

        } catch (error) {
            console.error('Errore get users:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }

    // Aggiorna ruolo utente (solo admin)
    static async updateUserRole(req: Request, res: Response) {
        try {
            const { email, role } = req.body;

            // Verifica che l'utente sia admin
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ error: 'Token mancante' });
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bom-app-secret') as any;

            if (decoded.role !== 'admin') {
                return res.status(403).json({ error: 'Accesso negato. Solo admin.' });
            }

            const user = await userRepository.updateRole(email, role, getRolePermissions(role));
            if (!user) {
                return res.status(404).json({ error: 'Utente non trovato' });
            }

            res.json({
                success: true,
                message: `Ruolo di ${email} aggiornato a ${role}`,
                user
            });

        } catch (error) {
            console.error('Errore update role:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }

    // Elimina utente (solo admin)
    static async deleteUser(req: Request, res: Response) {
        try {
            const { email } = req.params;

            // Verifica che l'utente sia admin
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ error: 'Token mancante' });
            }

            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bom-app-secret') as any;

            if (decoded.role !== 'admin') {
                return res.status(403).json({ error: 'Accesso negato. Solo admin.' });
            }

            // Non permettere di eliminare se stesso
            if (decoded.email === email) {
                return res.status(400).json({ error: 'Non puoi eliminare te stesso' });
            }

            const deleted = await userRepository.delete(email);
            if (!deleted) {
                return res.status(404).json({ error: 'Utente non trovato' });
            }

            res.json({
                success: true,
                message: `Utente ${email} eliminato con successo`
            });

        } catch (error) {
            console.error('Errore delete user:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }

    // Registrazione nuovo utente
    static async registerUser(req: Request, res: Response) {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({ error: 'Nome, email e password richiesti' });
            }

            // CRITICAL: Verifica connessione database prima di procedere
            const db = DatabaseConnection.getInstance();
            const isDbConnected = await db.testConnection();
            
            if (!isDbConnected) {
                console.error('🚨 SECURITY ALERT: Registration attempt without database connection!');
                return res.status(503).json({
                    error: 'Servizio temporaneamente non disponibile',
                    details: 'Database non connesso. Configura PostgreSQL per abilitare la registrazione.'
                });
            }

            // Verifica se l'utente esiste già
            const existingUser = await userRepository.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ error: 'Utente già registrato con questa email' });
            }

            // Determina ruolo basato su email
            const role: UserRole =
                email === 'a.simone@powerflex.it' ? 'admin' :
                    email === 'g.bejenaru.powerflex@gmail.com' ? 'manager' : 'viewer';

            // Crea nuovo utente nel database
            const newUser = await userRepository.create({
                name: name,
                email: email,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1890ff&color=fff`,
                role: role,
                permissions: getRolePermissions(role),
                provider: 'registration',
                password: password // Password verrà hashata nel repository
            });

            if (!newUser) {
                return res.status(500).json({ error: 'Errore nella creazione dell\'utente' });
            }

            // Genera JWT
            const jwtToken = jwt.sign(
                {
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role,
                    permissions: newUser.permissions,
                    provider: newUser.provider
                },
                process.env.JWT_SECRET || 'bom-app-secret',
                { expiresIn: '7d' }
            );

            // Mappa i campi dal formato database al formato frontend
            const frontendUser = {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                avatar: newUser.avatar,
                role: newUser.role,
                permissions: newUser.permissions,
                provider: newUser.provider,
                createdAt: newUser.created_at,
                lastLogin: newUser.last_login
            };

            res.json({
                success: true,
                user: frontendUser,
                token: jwtToken,
                message: 'Registrazione completata con successo!'
            });

        } catch (error) {
            console.error('Errore registrazione:', error);
            res.status(500).json({ error: 'Errore interno del server' });
        }
    }
}