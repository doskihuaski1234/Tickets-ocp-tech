import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN } from '../services/mapboxConfig';
import type { Ticket } from '../types/tickets';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapaPageProps {
  tickets: Ticket[];
  technicianLocation?: { lat: number; lng: number } | null;
}

const MapaPage: React.FC<MapaPageProps> = ({ tickets, technicianLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const routeSourceId = 'technician-route';

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-90.5, 14.6],
      zoom: 7
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    let cancelled = false;

    const limpiarRuta = () => {
      if (!map.current?.isStyleLoaded()) return;
      if (map.current.getLayer(routeSourceId)) {
        map.current.removeLayer(routeSourceId);
      }
      if (map.current.getSource(routeSourceId)) {
        map.current.removeSource(routeSourceId);
      }
    };

    const cargarMapa = async () => {
      if (!map.current || cancelled) return;

      markers.current.forEach(m => m.remove());
      markers.current = [];
      limpiarRuta();

      tickets.forEach(t => {
        if (typeof t.lat === 'number' && typeof t.lng === 'number') {
          const marker = new mapboxgl.Marker({ color: '#3b82f6' })
            .setLngLat([t.lng, t.lat])
            .setPopup(
              new mapboxgl.Popup().setHTML(
                `<strong>${t.empresa}</strong><br/>${t.sucursal}`
              )
            )
            .addTo(map.current!);

          markers.current.push(marker);
        }
      });

      if (technicianLocation) {
        const technicianMarker = new mapboxgl.Marker({ color: '#16a34a' })
          .setLngLat([technicianLocation.lng, technicianLocation.lat])
          .setPopup(new mapboxgl.Popup().setText('Mi ubicación actual'))
          .addTo(map.current);

        markers.current.push(technicianMarker);
      }

      const destinos = tickets.filter(t =>
        typeof t.lat === 'number' && typeof t.lng === 'number'
      );

      if (!technicianLocation || destinos.length === 0) return;

      const destino = destinos.reduce((masCercano, ticket) => {
        const distanciaActual = Math.hypot(
          ticket.lat! - technicianLocation.lat,
          ticket.lng! - technicianLocation.lng
        );
        const distanciaAnterior = Math.hypot(
          masCercano.lat! - technicianLocation.lat,
          masCercano.lng! - technicianLocation.lng
        );
        return distanciaActual < distanciaAnterior ? ticket : masCercano;
      });

      const coordinates = `${technicianLocation.lng},${technicianLocation.lat};${destino.lng},${destino.lat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&language=es`;
      const response = await fetch(url);
      if (!response.ok || cancelled) return;

      const data = await response.json() as {
        routes?: Array<{
          geometry?: {
            type: 'LineString';
            coordinates: number[][];
          };
        }>;
      };
      const geometry = data.routes?.[0]?.geometry;
      if (!geometry || cancelled || !map.current?.isStyleLoaded()) return;

      map.current.addSource(routeSourceId, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry },
      });
      map.current.addLayer({
        id: routeSourceId,
        type: 'line',
        source: routeSourceId,
        paint: {
          'line-color': '#f97316',
          'line-width': 5,
          'line-opacity': 0.9,
        },
      });
    };

    if (map.current.isStyleLoaded()) {
      void cargarMapa();
    } else {
      map.current.once('load', cargarMapa);
    }

    requestAnimationFrame(() => {
      map.current?.resize();
    });

    return () => {
      cancelled = true;
      map.current?.off('load', cargarMapa);
    };
  }, [tickets, technicianLocation]);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div
        ref={mapContainer}
        style={{ width: '100%', height: 'min(70vh, 580px)', minHeight: '320px', borderRadius: '14px' }}
      />
    </div>
  );
};

export default MapaPage;