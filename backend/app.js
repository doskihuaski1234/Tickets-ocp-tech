const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/ticket.routes');
const sequelize = require('./config/database');

const app = express();
let databaseReady;

const initializeDatabase = () => {
    if (!databaseReady) {
        if (sequelize.configurationError) {
            databaseReady = Promise.reject(sequelize.configurationError);
        } else {
            databaseReady = sequelize.authenticate().then(() => sequelize.sync());
        }
    }

    return databaseReady;
};

app.set('trust proxy', 1);

app.use(
    cors({
        origin: (origin, callback) => {
            const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
                .split(',')
                .map((value) => value.trim())
                .map((value) => value.replace(/\/$/, ''))
                .filter(Boolean);

            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error('Origen no permitido por CORS'));
        },
        credentials: true
    })
);

app.use(express.json());

app.use(async (req, res, next) => {
    try {
        if (!process.env.JWT_SECRET) {
            const error = new Error('Falta la variable JWT_SECRET');
            error.status = 503;
            throw error;
        }

        await initializeDatabase();
        next();
    } catch (error) {
        console.error('No se pudo conectar con MySQL:', error.message);
        res.status(503).json({
            success: false,
            message: error.message
        });
    }
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

// Vercel puede entregar la ruta sin el prefijo /api al adaptador Express.
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Backend de Tickets funcionando correctamente'
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta API no encontrada'
    });
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    console.error('Error no controlado en la API:', error);
    return res.status(error.status || 500).json({
        success: false,
        message: error.status ? error.message : 'Error interno del servidor'
    });
});

module.exports = { app, sequelize };