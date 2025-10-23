import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

// Route per ottenere l'URL di autorizzazione Google
router.get('/google/url', AuthController.getGoogleAuthUrl);

// Route per gestire il callback di Google OAuth
router.post('/google/callback', AuthController.handleGoogleCallback);

// Route per verificare token JWT
router.post('/verify', AuthController.verifyToken);

// Route demo rimossa per sicurezza

// Route per login con email - MIDDLEWARE RIMOSSO TEMPORANEAMENTE
router.post('/email', AuthController.loginWithEmail);

// Route per registrazione nuovo utente
router.post('/register', AuthController.registerUser);

// Route per gestione utenti (solo admin)
router.get('/users', AuthController.getAllUsers);
router.put('/users/role', AuthController.updateUserRole);
router.delete('/users/:email', AuthController.deleteUser);

export default router;