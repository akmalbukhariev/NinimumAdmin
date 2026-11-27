import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Courier GPS V1b: one Leaflet map with OpenStreetMap tiles (free, no key). Shahrisabz is the default view.
export const SHAHRISABZ: [number, number] = [39.0578, 66.8342];

/** Ninimum works in Shahrisabz: the map opens there and only fits to points within this distance of the city. */
const AREA_KM = 60;
function nearShahrisabz(p: [number, number]) {
  const dLat = (p[0] - SHAHRISABZ[0]) * 111, dLon = (p[1] - SHAHRISABZ[1]) * 111 * Math.cos(SHAHRISABZ[0] * Math.PI / 180);
  return Math.hypot(dLat, dLon) <= AREA_KM;
}

export type MapMarker = { lat: number; lon: number; color: string; label: string; popup?: string; big?: boolean };
export type MapLine = { points: [number, number][]; color: string };

/** Draws markers and lines; fits the view to them once (or whenever fitKey changes). */
export function CourierMap({ markers, lines = [], height = 520, fitKey }: { markers: MapMarker[]; lines?: MapLine[]; height?: number | string; fitKey?: string }) {
  const [refit, setRefit] = useState(0);
  const box = useRef<HTMLDivElement | null>(null), map = useRef<L.Map | null>(null), layer = useRef<L.LayerGroup | null>(null), fitted = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!box.current || map.current) return;
    // Owner request 2026-11-27: always start on Shahrisabz; zoom with the wheel, double click, pinch or the +/− buttons.
    map.current = L.map(box.current, { zoomControl: false, minZoom: 8, maxZoom: 19, zoomSnap: 0.5, zoomDelta: 1, wheelPxPerZoomLevel: 90 }).setView(SHAHRISABZ, 13);
    L.control.zoom({ position: 'topleft', zoomInTitle: 'Yaqinlashtirish', zoomOutTitle: 'Uzoqlashtirish' }).addTo(map.current);
    const Home = L.Control.extend({ onAdd: () => {
      const b = L.DomUtil.create('button', 'ninimum-map-home');
      b.type = 'button'; b.title = 'Shahrisabz'; b.textContent = 'Shahrisabz';
      b.style.cssText = 'background:#fff;border:2px solid rgba(0,0,0,.2);border-radius:8px;padding:6px 10px;font:700 13px Manrope,sans-serif;cursor:pointer;color:#1F2233';
      L.DomEvent.on(b, 'click', e => { L.DomEvent.stop(e); map.current?.setView(SHAHRISABZ, 13); });
      return b;
    } });
    new Home({ position: 'topright' }).addTo(map.current);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    // The map often mounts inside a dialog or tab that is still sizing; measure again once it has its size, then fit again.
    setTimeout(() => { map.current?.invalidateSize(); fitted.current = undefined; setRefit(n => n + 1); }, 300);
    return () => { map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const bounds: [number, number][] = [];
    for (const line of lines) if (line.points.length > 1) { L.polyline(line.points, { color: line.color, weight: 4, opacity: 0.85 }).addTo(g); bounds.push(...line.points); }
    for (const p of markers) {
      const size = p.big ? 30 : 22;
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${p.color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);color:#fff;font:700 ${p.big ? 12 : 10}px/${size - 4}px sans-serif;text-align:center">${escapeHtml(p.label)}</div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([p.lat, p.lon], { icon }).addTo(g);
      if (p.popup) marker.bindPopup(p.popup);
      bounds.push([p.lat, p.lon]);
    }
    const key = fitKey ?? 'once';
    // Points far from Shahrisabz (a test phone abroad, a wrong customer pin) are drawn but never used to zoom out to the whole world.
    const near = bounds.filter(nearShahrisabz);
    if (fitted.current !== key) {
      fitted.current = key;
      if (!near.length) m.setView(SHAHRISABZ, 13);
      else if (near.length === 1) m.setView(near[0], 15);
      else m.fitBounds(L.latLngBounds(near), { padding: [30, 30], maxZoom: 16 });
    }
  }, [markers, lines, fitKey, refit]);
  return <Box ref={box} sx={{ height, width: '100%', borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', zIndex: 0, position: 'relative',
    '& .leaflet-control-zoom a': { width: 38, height: 38, lineHeight: '38px', fontSize: 22 } }} />;
}

export function escapeHtml(text: unknown): string {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
}

/** How long ago, in plain Uzbek/Russian/English. */
export function ago(iso: unknown, l: (uz: string, ru: string, en: string) => string): string {
  if (!iso) return l('hech qachon', 'никогда', 'never');
  const minutes = Math.max(0, Math.round((Date.now() - new Date(String(iso)).getTime()) / 60000));
  if (minutes < 1) return l('hozirgina', 'только что', 'just now');
  if (minutes < 60) return l(`${minutes} daqiqa oldin`, `${minutes} мин назад`, `${minutes} min ago`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return l(`${hours} soat oldin`, `${hours} ч назад`, `${hours} h ago`);
  return l(`${Math.floor(hours / 24)} kun oldin`, `${Math.floor(hours / 24)} дн назад`, `${Math.floor(hours / 24)} d ago`);
}
