import { Request, Response, NextFunction } from 'express';

// 🔐 MIDDLEWARE DI SICUREZZA AGGIORNATO
// Permette l'accesso a tutti gli utenti registrati nel database

export const ultraSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Applica solo alle route di login
    if (req.path === '/email' && req.method === 'POST') {
        const { email } = req.body;
        
        console.log(`🔐 SECURITY MIDDLEWARE: Processing login for ${email}`);
        
        if (!email) {
            console.log(`🚨 SECURITY BLOCK: No email provided`);
            return res.status(401).json({
                error: 'Accesso negato',
                message: 'Email richiesta per l\'autenticazione'
            });
        }
        
        // WHITELIST RIMOSSA: Ora tutti gli utenti registrati nel database possono accedere
        // La verifica dell'esistenza dell'utente avviene nel controller
        console.log(`✅ MIDDLEWARE: ${email} allowed to proceed - database will verify user existence`);
    }
    
    next();
};

export default ultraSecurityMiddleware;