const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


/*
|--------------------------------------------------------------------------
| REGISTRAR USUARIO
|--------------------------------------------------------------------------
*/

const registrar = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, correo electrónico y contraseña son obligatorios'
            });
        }

        const emailNormalizado = email.toLowerCase().trim();

        const usuarioExistente = await User.findOne({
            where: {
                email: emailNormalizado
            }
        });

        if (usuarioExistente) {
            return res.status(409).json({
                success: false,
                message: 'El correo electrónico ya está registrado'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        /*
         * Todos los usuarios registrados mediante este endpoint
         * serán técnicos.
         *
         * Los administradores no se crean automáticamente desde
         * este endpoint.
         */

        const nuevoUsuario = await User.create({
            nombre,
            email: emailNormalizado,
            password: passwordHash,
            rol: 'tecnico',
            activo: true,
            emailVerificado: false
        });

        console.log(
            `Usuario registrado: ${nuevoUsuario.email} - rol: ${nuevoUsuario.rol}`
        );

        return res.status(201).json({
            success: true,
            message: 'Usuario registrado correctamente',

            user: {
                id: nuevoUsuario.id,
                name: nuevoUsuario.nombre,
                email: nuevoUsuario.email,
                role: nuevoUsuario.rol
            }
        });

    } catch (error) {
        console.error(
            'Error en registro:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};


/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

const login = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Correo electrónico y contraseña son obligatorios'
            });
        }

        const emailNormalizado = email.toLowerCase().trim();

        const usuario = await User.findOne({
            where: {
                email: emailNormalizado
            }
        });

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Correo o contraseña incorrectos'
            });
        }

        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                success: false,
                message: 'Correo o contraseña incorrectos'
            });
        }

        if (!usuario.activo) {
            return res.status(403).json({
                success: false,
                message: 'La cuenta está desactivada'
            });
        }

        /*
         * Crear JWT utilizando exclusivamente
         * la clave definida en el archivo .env
         */

        if (!process.env.JWT_SECRET) {
            console.error(
                'ERROR: JWT_SECRET no está configurado en el archivo .env'
            );

            return res.status(500).json({
                success: false,
                message: 'Configuración de seguridad del servidor incompleta'
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                role: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        );

        /*
         * IMPORTANTE:
         * El frontend utiliza:
         *
         * data.user.name
         * data.user.email
         * data.user.role
         */

        return res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,

            user: {
                id: usuario.id,
                name: usuario.nombre,
                email: usuario.email,
                role: usuario.rol
            }
        });

    } catch (error) {
        console.error(
            'Error en login:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};


/*
|--------------------------------------------------------------------------
| EXPORTAR FUNCIONES
|--------------------------------------------------------------------------
*/

module.exports = {
    registrar,
    login
};