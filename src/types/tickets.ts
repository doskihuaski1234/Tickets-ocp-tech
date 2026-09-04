export type TicketStatus = 'abierto' | 'procesado' | 'cerrado';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;

  empresa: string;
  sucursal: string;
  departamento: string;
  municipio: string;
  direccion: string;

  assignedTo?: string;
  assignedToName?: string;
  notification?: string;
  evidenceBefore?: string;
  evidenceAfter?: string;
  evidenceBeforeImage?: string;
  evidenceAfterImage?: string;

  lat?: number;
  lng?: number;
  createdBy?: string;
  telefono?: string;
  emailCliente?: string;
  tecnico?: string;
  diagnostico?: string;
  resultado?: string;
}