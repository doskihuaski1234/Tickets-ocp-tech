const { Op } = require('sequelize');
const crypto = require('crypto');
const Ticket = require('../models/Ticket');

const VALID_STATUSES = new Set(['abierto', 'procesado', 'cerrado']);

const parseCoordinate = (value, name) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    const max = name === 'lat' ? 90 : 180;
    if (!Number.isFinite(number) || number < -max || number > max) {
        const error = new Error(`${name} debe ser una coordenada válida`);
        error.status = 400;
        throw error;
    }
    return number;
};

const validateRequired = (body, fields) => {
    const missing = fields.filter((field) => typeof body[field] !== 'string' || !body[field].trim());
    if (missing.length) {
        const error = new Error(`Campos obligatorios faltantes: ${missing.join(', ')}`);
        error.status = 400;
        throw error;
    }
};

const serialize = (ticket) => ticket.toJSON();

exports.list = async (req, res) => {
    const where = req.user.role === 'tecnico'
        ? { [Op.or]: [{ assignedTo: null }, { assignedTo: req.user.email }] }
        : undefined;
    const tickets = await Ticket.findAll({ where, order: [['createdAt', 'DESC']] });
    return res.json(tickets.map(serialize));
};

exports.get = async (req, res) => {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });
    if (req.user.role === 'tecnico' && ticket.assignedTo && ticket.assignedTo !== req.user.email) {
        return res.status(403).json({ message: 'No tienes acceso a este ticket' });
    }
    return res.json(serialize(ticket));
};

exports.create = async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Solo un administrador puede crear tickets' });
    validateRequired(req.body, ['title', 'description', 'empresa', 'sucursal', 'departamento', 'municipio', 'direccion']);
    const status = req.body.status || 'abierto';
    if (!VALID_STATUSES.has(status)) return res.status(400).json({ message: 'Estado inválido' });

    const ticket = await Ticket.create({
        id: String(req.body.id || crypto.randomUUID()),
        title: req.body.title.trim(),
        description: req.body.description.trim(),
        status,
        empresa: req.body.empresa.trim(),
        sucursal: req.body.sucursal.trim(),
        departamento: req.body.departamento.trim(),
        municipio: req.body.municipio.trim(),
        direccion: req.body.direccion.trim(),
        lat: parseCoordinate(req.body.lat, 'lat'),
        lng: parseCoordinate(req.body.lng, 'lng'),
        createdBy: req.user.email,
        notification: req.body.notification || 'Nueva orden disponible para técnicos',
        telefono: req.body.telefono || null,
        emailCliente: req.body.emailCliente || null
    });
    return res.status(201).json(serialize(ticket));
};

exports.update = async (req, res) => {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = ticket.assignedTo === req.user.email;
    const isTaking = req.user.role === 'tecnico' && ticket.status === 'abierto' && !ticket.assignedTo && req.body.status === 'procesado';

    if (!isAdmin && !isOwner && !isTaking) return res.status(403).json({ message: 'No tienes permisos para modificar este ticket' });

    if (isTaking) {
        const [affected] = await Ticket.update({
            assignedTo: req.user.email,
            assignedToName: req.user.name || req.user.email,
            status: 'procesado',
            notification: `La orden fue tomada por ${req.user.name || req.user.email}`
        }, { where: { id: req.params.id, status: 'abierto', assignedTo: null } });
        if (affected !== 1) return res.status(409).json({ message: 'El ticket ya fue tomado o no está disponible' });
        return res.json(serialize(await Ticket.findByPk(req.params.id)));
    }

    if (req.body.status && !VALID_STATUSES.has(req.body.status)) return res.status(400).json({ message: 'Estado inválido' });
    if (req.body.assignedTo !== undefined && !isAdmin) return res.status(403).json({ message: 'Un técnico no puede modificar assignedTo' });
    if (!isAdmin && req.body.status === 'cerrado' && !(ticket.status === 'procesado' && ticket.assignedTo === req.user.email)) {
        return res.status(403).json({ message: 'Solo puedes cerrar tus tickets procesados' });
    }

    const allowed = isAdmin
        ? ['title', 'description', 'status', 'empresa', 'sucursal', 'departamento', 'municipio', 'direccion', 'assignedTo', 'assignedToName', 'notification', 'telefono', 'emailCliente', 'tecnico', 'diagnostico', 'resultado']
        : ['status', 'notification', 'evidenceBefore', 'evidenceAfter', 'evidenceBeforeImage', 'evidenceAfterImage', 'tecnico', 'diagnostico', 'resultado'];
    const updates = {};
    for (const field of allowed) if (req.body[field] !== undefined) updates[field] = req.body[field];
    if (req.body.lat !== undefined) updates.lat = parseCoordinate(req.body.lat, 'lat');
    if (req.body.lng !== undefined) updates.lng = parseCoordinate(req.body.lng, 'lng');
    await ticket.update(updates);
    return res.json(serialize(ticket));
};

exports.remove = async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Solo un administrador puede eliminar tickets' });
    const deleted = await Ticket.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Ticket no encontrado' });
    return res.json({ message: 'Ticket eliminado correctamente' });
};
