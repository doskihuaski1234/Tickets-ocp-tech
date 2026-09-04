import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Ticket } from '../types/tickets';

export interface FormData {
  tecnico: string;
  diagnostico: string;
  resultado: string;
  telefono: string;
  emailCliente: string;
  fecha?: string;
  hora?: string;
  pais?: string;
  cliente?: string;
  ubicacion?: string;
  observaciones?: string;
}

export const generarHojaServicioPDF = (ticket: Ticket, formData: FormData) => {
  const doc = new jsPDF();
  const primaryColor = [20, 50, 110] as [number, number, number]; // Azul corporativo OCP TECH

  // --- ENCABEZADO SUPERIOR ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 20, 'F'); // Franja azul superior

  // Texto o simulación de Logo "OCP TECH" en la esquina superior izquierda
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OCP TECH', 14, 13);

  // --- TABLA DE DATOS SUPERIOR (Estilo formato oficial) ---
  autoTable(doc, {
    startY: 28,
    body: [
      [
        { content: 'Fecha:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 22 } },
        { content: formData.fecha || new Date().toISOString().split('T')[0], styles: { cellWidth: 73 } },
        { content: 'Hora:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 20 } },
        { content: formData.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), styles: { cellWidth: 75 } }
      ],
      [
        { content: 'No Ticket:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: String(ticket.id) },
        { content: 'Técnico:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: formData.tecnico }
      ],
      [
        { content: 'País:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: formData.pais || 'Guatemala' },
        { content: 'Cliente:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: formData.cliente || ticket.empresa || '' }
      ],
      [
        { content: 'Ubicación:', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: formData.ubicacion || ticket.sucursal || '' },
      ]
    ],
    theme: 'grid',
    styles: {
      fontSize: 9,
      textColor: [50, 50, 50],
      cellPadding: 2.5,
      lineColor: [180, 180, 180],
      lineWidth: 0.1,
    },
    margin: { left: 14, right: 14 },
  });

  // --- SECCIONES DE CONTENIDO (Bloques limpios) ---
  const autoTableDocument = doc as jsPDF & { lastAutoTable: { finalY: number } };
  let currentY = autoTableDocument.lastAutoTable.finalY + 8;

  const agregarSeccion = (titulo: string, contenido: string, alturaBox: number) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(titulo, 14, currentY);

    currentY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    // Texto o descripción dentro del bloque
    doc.text(contenido || '', 16, currentY + 4, { maxWidth: 178 });

    // Cuadro contenedor sutil
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.rect(14, currentY, 182, alturaBox);

    currentY += alturaBox + 6;
  };

  agregarSeccion('Descripción de la incidencia:', ticket.title || '', 18);
  agregarSeccion('Diagnóstico y acciones realizadas:', formData.diagnostico || '', 28);
  agregarSeccion('Resultado y estado final:', formData.resultado || ticket.status || '', 22);
  agregarSeccion('Observaciones y recomendaciones:', formData.observaciones || '', 22);

  // --- EVIDENCIA INTERNA (NO SE IMPRIME EN EL PDF FINAL DEL CLIENTE) ---
  const evidenciaInterna = [
    formData.tecnico ? `Técnico: ${formData.tecnico}` : '',
    formData.diagnostico ? `Diagnóstico: ${formData.diagnostico}` : '',
    formData.resultado ? `Resultado: ${formData.resultado}` : ''
  ].filter(Boolean).join('\n');

  if (evidenciaInterna) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Registro interno de evidencia:', 14, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(evidenciaInterna, 16, currentY + 4, { maxWidth: 178 });
    currentY += 18;
  }

  // --- LÍNEAS DE FIRMA ---
  const signatureY = currentY + 12;
  doc.setLineWidth(0.3);
  doc.setDrawColor(100, 100, 100);

  // Firma Técnico
  doc.line(25, signatureY, 85, signatureY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Firma del Técnico', 43, signatureY + 5);

  // Firma Encargado en Tienda
  doc.line(125, signatureY, 185, signatureY);
  doc.text('Firma del Encargado en Tienda', 133, signatureY + 5);

  // --- PIE DE PÁGINA CORPORATIVO ---
  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, pageHeight - 15, 210, 15, 'F'); // Franja azul inferior

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('INGENIERÍA DE IMPACTO', 14, pageHeight - 7);
  doc.text('www.ocp.tech', 75, pageHeight - 7);
  doc.text('1', 195, pageHeight - 7, { align: 'right' });

  return doc;
};