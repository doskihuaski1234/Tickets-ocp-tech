const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '.env')
});

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/ticket.routes');
const sequelize = require('./config/database');

const app = express();

const PORT = process.env.PORT || 5000;


/*
|--------------------------------------------------------------------------
| VALIDAR CONFIGURACIÓN DE SEGURIDAD
|--------------------------------------------------------------------------
*/

if (!process.env.JWT_SECRET) {
    console.error(
        'ERROR: JWT_SECRET no está configurado en el archivo .env'
    );

    process.exit(1);
}


/*
|--------------------------------------------------------------------------
| MIDDLEWARES
|--------------------------------------------------------------------------
*/

app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    })
);

app.use(express.json());


/*
|--------------------------------------------------------------------------
| RUTAS API
|--------------------------------------------------------------------------
*/

app.use('/api/health', healthRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/tickets', ticketRoutes);


/*
|--------------------------------------------------------------------------
| RUTA PRINCIPAL
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Backend de Tickets funcionando correctamente'
    });
});


/*
|--------------------------------------------------------------------------
| INICIAR SERVIDOR
|--------------------------------------------------------------------------
*/

const start = async () => {
    try {

        /*
         * Verificar conexión con MySQL
         */

        await sequelize.authenticate();

        console.log(
            'Conexión con MySQL establecida correctamente'
        );


        /*
         * Sincronizar modelos
         */

        await sequelize.sync();

        console.log(
            'Modelos sincronizados correctamente'
        );


        /*
         * Iniciar servidor
         */

        app.listen(PORT, () => {
            console.log(
                `Servidor backend ejecutándose en http://localhost:${PORT}`
            );
        });

    } catch (error) {

        console.error(
            'No se pudo iniciar el backend con MySQL:',
            error.message
        );

        process.exit(1);
    }
};


start();