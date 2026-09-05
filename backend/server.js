const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '.env')
});

const { app, sequelize } = require('./app');

const PORT = process.env.PORT || 5000;


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

        app.listen(PORT, '0.0.0.0', () => {
            console.log(
                `Servidor backend ejecutándose en http://0.0.0.0:${PORT}`
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