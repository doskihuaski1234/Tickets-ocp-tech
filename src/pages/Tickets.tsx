import React from 'react';

import type { Ticket, TicketStatus } from '../types/tickets';

interface TicketsProps {
  tickets: Ticket[];
  onUpdateStatus: (id: string, newStatus: TicketStatus) => void;
  onDelete: (id: string) => void;
}

const Tickets: React.FC<TicketsProps> = ({
  tickets,
  onUpdateStatus,
  onDelete,
}) => {
  const renderColumn = (
    status: TicketStatus,
    title: string,
    color: string
  ) => {
    const filteredTickets = tickets.filter(
      (ticket) => ticket.status === status
    );

    return (
      <div className="flex min-w-[290px] flex-col rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:min-w-[320px]">
        <div
          className={`mb-4 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white ${color}`}
        >
          {title} ({filteredTickets.length})
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {filteredTickets.map((ticket) => {
            const description = ticket.description ?? '';

            return (
              <div
                key={ticket.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-800">
                    {ticket.title}
                  </h4>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('¿Deseas eliminar este ticket?')) {
                        onDelete(ticket.id);
                      }
                    }}
                    className="rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-500 transition hover:bg-red-100"
                    aria-label="Eliminar ticket"
                  >
                    🗑️
                  </button>
                </div>

                <p className="mb-3 text-xs leading-relaxed text-slate-600">
                  {description.substring(0, 80)}
                  {description.length > 80 ? '...' : ''}
                </p>

                <div className="flex gap-2">
                  {status === 'abierto' && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStatus(ticket.id, 'procesado')
                      }
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-2 py-2 text-xs font-semibold text-white shadow-sm"
                    >
                      Atender
                    </button>
                  )}

                  {status === 'procesado' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStatus(ticket.id, 'cerrado')
                        }
                        className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-2 text-xs font-semibold text-white shadow-sm"
                      >
                        Cerrar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStatus(ticket.id, 'abierto')
                        }
                        className="flex-1 rounded-xl bg-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                      >
                        Reabrir
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Gestión
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">
          Control de Tickets
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {renderColumn(
          'abierto',
          'Abiertos',
          'bg-gradient-to-r from-red-500 to-red-600'
        )}

        {renderColumn(
          'procesado',
          'En Proceso',
          'bg-gradient-to-r from-blue-600 to-indigo-600'
        )}

        {renderColumn(
          'cerrado',
          'Cerrados',
          'bg-gradient-to-r from-emerald-500 to-green-600'
        )}
      </div>
    </div>
  );
};

export default Tickets;
