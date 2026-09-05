const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/ticket.routes');
const sequelize = require('./config/database');

const app = express();
let databaseReady;

const initializeDatabase = () => {
    if (!databaseReady) {
        databaseReady = sequelize.authenticate().then(() => sequelize.sync());
    }

    return databaseReady;
};

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado');
}

app.set('trust proxy', 1);

app.use(
    cors({
        origin: process.env.FRONTEND_URL || true,
        credentials: true
    })
);

app.use(express.json());

app.use(async (req, res, next) => {
    try {
        await initializeDatabase();
        next();
    } catch (error) {
        console.error('No se pudo conectar con MySQL:', error.message);
        res.status(503).json({
            success: false,
            message: 'La base de datos no está disponible'
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

module.exports = { app, sequelize };