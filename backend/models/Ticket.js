const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
    id: { type: DataTypes.STRING(64), primaryKey: true, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.ENUM('abierto', 'procesado', 'cerrado'), allowNull: false, defaultValue: 'abierto' },
    empresa: { type: DataTypes.STRING(255), allowNull: false },
    sucursal: { type: DataTypes.STRING(255), allowNull: false },
    departamento: { type: DataTypes.STRING(255), allowNull: false },
    municipio: { type: DataTypes.STRING(255), allowNull: false },
    direccion: { type: DataTypes.STRING(500), allowNull: false },
    lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    assignedTo: { type: DataTypes.STRING(255), allowNull: true },
    assignedToName: { type: DataTypes.STRING(255), allowNull: true },
    createdBy: { type: DataTypes.STRING(255), allowNull: false },
    notification: { type: DataTypes.TEXT, allowNull: true },
    evidenceBefore: { type: DataTypes.TEXT, allowNull: true },
    evidenceAfter: { type: DataTypes.TEXT, allowNull: true },
    evidenceBeforeImage: { type: DataTypes.TEXT('long'), allowNull: true },
    evidenceAfterImage: { type: DataTypes.TEXT('long'), allowNull: true },
    telefono: { type: DataTypes.STRING(50), allowNull: true },
    emailCliente: { type: DataTypes.STRING(255), allowNull: true },
    tecnico: { type: DataTypes.STRING(255), allowNull: true },
    diagnostico: { type: DataTypes.TEXT, allowNull: true },
    resultado: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'tickets',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});

module.exports = Ticket;
