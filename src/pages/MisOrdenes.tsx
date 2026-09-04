import React, { useState, useEffect } from 'react';
import type { Ticket, TicketStatus } from '../types/tickets';

interface MisOrdenesProps {
  tickets: Ticket[];
  onUpdateStatus: (id: string, newStatus: TicketStatus) => void;
  technicianLocation?: { lat: number; lng: number } | null;
}

export const MisOrdenes: React.FC<MisOrdenesProps> = ({ tickets, onUpdateStatus, technicianLocation }) => {
  const [browserLocation, setBrowserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const ubicacionTecnico = technicianLocation || browserLocation;
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(() =>
    'geolocation' in navigator ? null : 'Tu navegador no soporta geolocalización.'
  );

  useEffect(() => {
    if (technicianLocation) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setBrowserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setErrorUbicacion('No se pudo obtener tu ubicación para calcular la cercanía.');
          console.error(error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [technicianLocation]);

  // Función auxiliar opcional para calcular distancia aproximada (Fórmula Haversine simplificada)
  const calcularDistanciaKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const ticketsOrdenados = [...tickets].sort((a, b) => {
    if (!ubicacionTecnico) return 0;

    const aTieneUbicacion = Number.isFinite(a.lat) && Number.isFinite(a.lng);
    const bTieneUbicacion = Number.isFinite(b.lat) && Number.isFinite(b.lng);

    if (!aTieneUbicacion && !bTieneUbicacion) return 0;
    if (!aTieneUbicacion) return 1;
    if (!bTieneUbicacion) return -1;

    const distanciaA = calcularDistanciaKm(ubicacionTecnico.lat, ubicacionTecnico.lng, a.lat, a.lng);
    const distanciaB = calcularDistanciaKm(ubicacionTecnico.lat, ubicacionTecnico.lng, b.lat, b.lng);

    return distanciaA - distanciaB;
  });

  if (!tickets.length) {
    return (
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-700">📦</div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Mis órdenes</h2>
            <p className="text-xs text-slate-500 uppercase tracking-[0.18em]">Disponibles y asignadas</p>
          </div>
        </div>
        <p className="mt-5 text-sm text-slate-500">No tienes órdenes disponibles o asignadas en este momento.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Operación</p>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">Mis órdenes y Disponibles</h2>
          {errorUbicacion && <p className="mt-1 text-xs text-amber-600">{errorUbicacion}</p>}
        </div>
        <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm">
          {tickets.length} órdenes en total
        </div>
      </div>

      {ticketsOrdenados.map((ticket) => {
        const distancia =
          ubicacionTecnico && Number.isFinite(ticket.lat) && Number.isFinite(ticket.lng)
            ? calcularDistanciaKm(ubicacionTecnico.lat, ubicacionTecnico.lng, ticket.lat, ticket.lng)
            : null;

        const esMasCercana =
          distancia !== null &&
          ticketsOrdenados.length > 1 &&
          distancia === Math.min(
            ...ticketsOrdenados
              .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
              .map((item) => calcularDistanciaKm(ubicacionTecnico!.lat, ubicacionTecnico!.lng, item.lat, item.lng))
          );

        return (
          <div key={ticket.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)] sm:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Orden #{ticket.id}</p>
                <h3 className="mt-2 text-lg sm:text-xl font-bold text-slate-800 break-words">{ticket.title}</h3>
              </div>

              <span
                className={`inline-flex items-center self-start rounded-full px-3 py-1 text-[10px] sm:text-xs font-semibold ${
                  ticket.status === 'abierto'
                    ? 'bg-emerald-100 text-emerald-700'
                    : ticket.status === 'procesado'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {ticket.status === 'abierto' ? 'Disponible' : ticket.status === 'procesado' ? 'En proceso' : 'Cerrada'}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Información de la orden</p>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-2.5 shadow-sm break-words"><span className="font-semibold">Empresa:</span> {ticket.empresa || 'Sin empresa'}</div>
                <div className="rounded-xl bg-white p-2.5 shadow-sm break-words"><span className="font-semibold">Dirección:</span> {ticket.direccion || 'Sin dirección'}</div>
                <div className="rounded-xl bg-white p-2.5 shadow-sm break-words"><span className="font-semibold">Técnico asignado:</span> {ticket.assignedToName || 'Sin tomar'}</div>
                <div className="rounded-xl bg-white p-2.5 shadow-sm break-words">
                  <span className="font-semibold">Cercanía:</span>{' '}
                  <span className="text-emerald-600 font-medium">
                    {distancia !== null ? `${distancia.toFixed(1)} km` : 'Sin ubicación'}
                    {esMasCercana && ' · Más cercana'}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 break-words leading-relaxed">
              <span className="font-semibold text-slate-700">Descripción:</span> {ticket.description || 'Sin descripción registrada'}
            </p>

            {ticket.notification && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 break-words">
                <strong>Notificación del Administrador:</strong> {ticket.notification}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {ticket.status === 'abierto' && (
                <button
                  onClick={() => onUpdateStatus(ticket.id, 'procesado')}
                  className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)] hover:brightness-105"
                >
                  Tomar y Aceptar Orden
                </button>
              )}

              {ticket.status === 'procesado' && (
                <button
                  onClick={() => onUpdateStatus(ticket.id, 'cerrado')}
                  className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(16,185,129,0.25)] hover:brightness-105"
                >
                  Marcar como Resuelta
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MisOrdenes;