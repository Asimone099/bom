// Google OAuth callback endpoint
import { createApiHandler } from '../../../lib/cors.js';
import { query } from '../../../lib/db.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Codice di autorizzazione mancante' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).json({ error: 'Configurazione Google OAuth incompleta' });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return res.status(400).json({ error: 'Errore durante lo scambio del codice' });
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      return res.status(400).json({ error: 'Errore durante il recupero delle informazioni utente' });
    }

    const googleUser = await userResponse.json();

    // Check if user exists in database
    const existingUserResult = await query(
      'SELECT * FROM users WHERE email = $1',
      [googleUser.email]
    );

    let user;
    let isNewUser = false;

    if (existingUserResult.rows.length === 0) {
      // Create new user
      const defaultRoleResult = await query(
        'SELECT id FROM roles WHERE name = $1',
        ['viewer']
      );

      if (defaultRoleResult.rows.length === 0) {
        return res.status(500).json({ error: 'Ruolo predefinito non trovato' });
      }

      const roleId = defaultRoleResult.rows[0].id;

      const newUserResult = await query(
        `INSERT INTO users (username, email, password_hash, role_id, active, created_at, updated_at, last_login)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          googleUser.name,
          googleUser.email,
          'google_oauth', // Placeholder password for OAuth users
          roleId,
          true,
          new Date(),
          new Date(),
          new Date()
        ]
      );

      user = newUserResult.rows[0];
      isNewUser = true;
    } else {
      // Update existing user's last login
      const updateResult = await query(
        'UPDATE users SET last_login = $1 WHERE email = $2 RETURNING *',
        [new Date(), googleUser.email]
      );
      
      user = updateResult.rows[0];
    }

    // Get user role
    const roleResult = await query(
      'SELECT name, permissions FROM roles WHERE id = $1',
      [user.role_id]
    );

    const role = roleResult.rows[0];

    // Create user object for response
    const userResponse = {
      id: user.id,
      name: user.username,
      email: user.email,
      avatar: googleUser.picture,
      role: role.name,
      permissions: role.permissions,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };

    // Generate JWT token (simplified - in production use proper JWT library)
    const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email })).toString('base64');

    const message = isNewUser 
      ? `Benvenuto ${user.username}! Il tuo account è stato creato con successo.`
      : `Bentornato ${user.username}!`;

    res.status(200).json({
      user: userResponse,
      token,
      isNewUser,
      message
    });

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

export default createApiHandler(handler);