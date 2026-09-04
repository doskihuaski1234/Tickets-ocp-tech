const express = require('express');
const rateLimit = require('express-rate-limit');

const {
    registrar,
    login
} = require('../controllers/auth.controller');

const router = express.Router();


/*
|--------------------------------------------------------------------------
| RATE LIMIT PARA LOGIN
|--------------------------------------------------------------------------
| Limita los intentos de inicio de sesión para evitar ataques de fuerza
| bruta contra las contraseñas.
|
| Máximo: 10 intentos
| Ventana: 15 minutos
|--------------------------------------------------------------------------
*/

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    message: {
        success: false,
        message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.'
    }
});


/*
|--------------------------------------------------------------------------
| RUTAS DE AUTENTICACIÓN
|--------------------------------------------------------------------------
*/

router.post('/register', registrar);

router.post('/login', loginLimiter, login);


/*
|--------------------------------------------------------------------------
| EXPORTAR ROUTER
|--------------------------------------------------------------------------
*/

module.exports = router;