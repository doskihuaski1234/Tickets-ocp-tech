const jwt = require('jsonwebtoken');

const authMiddleware = (requiredRole = null) => (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    try {
        const token = header.slice(7);
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        if (requiredRole && req.user.role !== requiredRole) {
            return res.status(403).json({ message: 'No tienes permisos para esta acción' });
        }
        return next();
    } catch {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ message: 'No tienes permisos para esta acción' });
    }
    return next();
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
