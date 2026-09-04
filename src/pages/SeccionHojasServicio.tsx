import React, { useState } from 'react';
import type { Ticket } from '../types/tickets';
import { ticketService } from '../services/api';

interface Props {
  tickets: Ticket[];
}

export const SeccionHojasServicio: React.FC<Props> = ({ tickets }) => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Obtenemos fecha y hora actual por defecto
  const fechaActual = new Date().toISOString().split('T')[0];
  const horaActual = new Date().toTimeString().split(' ')[0].substring(0, 5);

  const [formData, setFormData] = useState({
    fecha: fechaActual,
    hora: horaActual,
    tecnico: '',
    pais: 'Guatemala',
    cliente: '',
    ubicacion: '',
    descripcion: '',
    diagnostico: '',
    resultado: '',
    observaciones: '',
    evidenceBefore: '',
    evidenceAfter: '',
    evidenceBeforeImage: '',
    evidenceAfterImage: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSelectTicket = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId) || null;
    setSelectedTicket(ticket);
    if (ticket) {
      setFormData(prev => ({
        ...prev,
        cliente: ticket.empresa || '',
        descripcion: ticket.title || '',
        resultado: ticket.status || '',
        evidenceBefore: ticket.evidenceBefore || '',
        evidenceAfter: ticket.evidenceAfter || '',
        evidenceBeforeImage: ticket.evidenceBeforeImage || '',
        evidenceAfterImage: ticket.evidenceAfterImage || ''
      }));
    }
  };

  const handleImageUpload = async (field: 'evidenceBeforeImage' | 'evidenceAfterImage', file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, [field]: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return alert('Selecciona un número de ticket primero');

    setLoading(true);
    try {
      const hojaServicioCompleta = {
        noTicket: selectedTicket.id,
        ...formData
      };

      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('La sesión expiró. Inicia sesión nuevamente.');
      }

      await ticketService.update(
        selectedTicket.id,
        {
          evidenceBefore: formData.evidenceBefore || null,
          evidenceAfter: formData.evidenceAfter || null,
          evidenceBeforeImage: formData.evidenceBeforeImage || null,
          evidenceAfterImage: formData.evidenceAfterImage || null,
          tecnico: formData.tecnico,
          diagnostico: formData.diagnostico,
          resultado: formData.resultado,
          notification: `Evidencia guardada para la orden ${selectedTicket.id}`
        },
        token
      );

      const currentStored = JSON.parse(localStorage.getItem('hojas_servicio_guardadas') || '{}');
      currentStored[selectedTicket.id] = hojaServicioCompleta;
      localStorage.setItem('hojas_servicio_guardadas', JSON.stringify(currentStored));

      console.log('Guardando Hoja de Servicio:', hojaServicioCompleta);
      alert('¡Hoja de servicio y evidencia guardadas con éxito!');

      setSelectedTicket(null);
      setFormData({
        fecha: fechaActual,
        hora: horaActual,
        tecnico: '',
        pais: 'Guatemala',
        cliente: '',
        ubicacion: '',
        descripcion: '',
        diagnostico: '',
        resultado: '',
        observaciones: '',
        evidenceBefore: '',
        evidenceAfter: '',
        evidenceBeforeImage: '',
        evidenceAfterImage: ''
      });
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Hubo un error al guardar la hoja de servicio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-3xl mx-auto my-4 border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Hoja de Servicio</h2>

      {/* Selector de Ticket */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Orden / Ticket</label>
        <select 
          value={selectedTicket ? selectedTicket.id : ""}
          onChange={(e) => handleSelectTicket(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">Seleccione una orden...</option>
          {tickets.map(t => (
            <option key={t.id} value={t.id}>Ticket #{t.id} - {t.title} ({t.empresa})</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleGuardar} className="space-y-4">
        {/* Fila 1: Fecha, Hora y No Ticket */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha:</label>
            <input 
              type="date"
              value={formData.fecha}
              onChange={e => setFormData({...formData, fecha: e.target.value})}
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hora:</label>
            <input 
              type="time"
              value={formData.hora}
              onChange={e => setFormData({...formData, hora: e.target.value})}
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">No Ticket:</label>
            <input 
              type="text"
              value={selectedTicket ? selectedTicket.id : ''}
              disabled
              placeholder="Automático"
              className="w-full p-2.5 border border-gray-200 rounded bg-gray-100 text-sm text-gray-500 font-medium"
            />
          </div>
        </div>

        {/* Fila 2: Técnico y País */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Técnico:</label>
            <input 
              type="text"
              value={formData.tecnico}
              onChange={e => setFormData({...formData, tecnico: e.target.value})}
              placeholder="Nombre del técnico asignado"
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">País:</label>
            <input 
              type="text"
              value={formData.pais}
              onChange={e => setFormData({...formData, pais: e.target.value})}
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
            />
          </div>
        </div>

        {/* Fila 3: Cliente y Ubicación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente:</label>
            <input 
              type="text"
              value={formData.cliente}
              onChange={e => setFormData({...formData, cliente: e.target.value})}
              placeholder="Empresa o cliente"
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ubicación:</label>
            <input 
              type="text"
              value={formData.ubicacion}
              onChange={e => setFormData({...formData, ubicacion: e.target.value})}
              placeholder="Dirección o sucursal"
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
            />
          </div>
        </div>

        {/* Textareas para descripciones detalladas */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción de la incidencia:</label>
          <textarea 
            rows={2}
            value={formData.descripcion}
            onChange={e => setFormData({...formData, descripcion: e.target.value})}
            placeholder="Detalle del reporte inicial..."
            className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Diagnóstico y acciones realizadas:</label>
          <textarea 
            rows={3}
            value={formData.diagnostico}
            onChange={e => setFormData({...formData, diagnostico: e.target.value})}
            placeholder="¿Qué se revisó y qué acciones se tomaron?"
            className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Resultado y estado final:</label>
          <input 
            type="text"
            value={formData.resultado}
            onChange={e => setFormData({...formData, resultado: e.target.value})}
            placeholder="Ej. Solucionado, Cerrado, Pendiente de repuesto..."
            className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones y recomendaciones:</label>
          <textarea 
            rows={2}
            value={formData.observaciones}
            onChange={e => setFormData({...formData, observaciones: e.target.value})}
            placeholder="Notas adicionales..."
            className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Antes del trabajo</label>
            <textarea
              rows={3}
              value={formData.evidenceBefore}
              onChange={e => setFormData({ ...formData, evidenceBefore: e.target.value })}
              placeholder="Describe la evidencia antes del trabajo"
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload('evidenceBeforeImage', e.target.files?.[0] || null)}
              className="mt-2 block w-full text-xs text-gray-500"
            />
            {formData.evidenceBeforeImage && (
              <img src={formData.evidenceBeforeImage} alt="Evidencia antes" className="mt-3 max-h-28 rounded border object-cover" />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Después del trabajo</label>
            <textarea
              rows={3}
              value={formData.evidenceAfter}
              onChange={e => setFormData({ ...formData, evidenceAfter: e.target.value })}
              placeholder="Describe la evidencia después del trabajo"
              className="w-full p-2.5 border border-gray-300 rounded bg-white text-sm"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload('evidenceAfterImage', e.target.files?.[0] || null)}
              className="mt-2 block w-full text-xs text-gray-500"
            />
            {formData.evidenceAfterImage && (
              <img src={formData.evidenceAfterImage} alt="Evidencia después" className="mt-3 max-h-28 rounded border object-cover" />
            )}
          </div>
        </div>

        {/* Simulación visual de sección de firmas */}
        <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-dashed border-gray-300 text-center text-xs text-gray-500">
          <div className="border-t border-gray-400 pt-2">Firma del Técnico</div>
          <div className="border-t border-gray-400 pt-2">Firma del Encargado en Tienda</div>
        </div>

        {/* Único Botón de Guardar */}
        <div className="pt-4">
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SeccionHojasServicio;