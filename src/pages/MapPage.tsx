import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, SlidersHorizontal, List, X, Locate, Plus } from 'lucide-react';
import { MOCK_VENUES, MOCK_TABLES, getTableForVenue } from '@/data/mock';
import { createMarkerSvgUrl } from '@/components/VenueMarkerIcon';
import VenueCard from '@/components/VenueCard';
import { TableBrand, Venue, VenueTable } from '@/types';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const SPAIN_CENTER: [number, number] = [40.0, -3.7];
const SPAIN_ZOOM = 6;

const TABLE_BRANDS: TableBrand[] = ['Presas', 'Tsunami', 'Infinity', 'Val', 'Garlando', 'Leonhart', 'Tornado', 'Otro'];

function LocateButton() {
  const map = useMap();
  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 14 });
  };
  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-24 right-3 z-[1000] rounded-xl bg-card p-3 shadow-elevated transition active:scale-95"
      aria-label="Mi ubicación"
    >
      <Locate className="h-5 w-5 text-primary" />
    </button>
  );
}

export default function MapPage() {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showList, setShowList] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<TableBrand | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [, forceUpdate] = useState(0);

  const [venueForm, setVenueForm] = useState({
    name: '',
    city: '',
    address: '',
    description: '',
    tableBrand: 'Presas' as TableBrand,
    tableQuantity: '1',
    observations: '',
  });

  const filteredVenues = useMemo(() => {
    return MOCK_VENUES.filter(v => {
      if (search) {
        const s = search.toLowerCase();
        if (!v.name.toLowerCase().includes(s) && !v.city.toLowerCase().includes(s)) return false;
      }
      if (selectedBrand) {
        const table = getTableForVenue(v.id);
        if (!table || table.brand !== selectedBrand) return false;
      }
      return true;
    });
  }, [search, selectedBrand]);

  const markerIcons = useMemo(() => {
    const icons: Record<string, L.Icon> = {};
    TABLE_BRANDS.forEach(brand => {
      icons[brand] = L.icon({
        iconUrl: createMarkerSvgUrl(brand, 40),
        iconSize: [40, 52],
        iconAnchor: [20, 52],
        popupAnchor: [0, -52],
      });
    });
    return icons;
  }, []);

  const handleAddVenue = () => {
    if (!venueForm.name.trim()) {
      toast.error('El nombre del local es obligatorio');
      return;
    }
    if (!venueForm.city.trim()) {
      toast.error('La ciudad es obligatoria');
      return;
    }

    const newId = `v_${Date.now()}`;
    const newVenue: Venue = {
      id: newId,
      name: venueForm.name,
      address: venueForm.address || '',
      city: venueForm.city,
      lat: 40.4168 + (Math.random() - 0.5) * 2,
      lng: -3.7038 + (Math.random() - 0.5) * 2,
      photos: [],
      description: venueForm.description || undefined,
      observations: venueForm.observations || undefined,
      status: 'pendiente',
      verificationLevel: 'no_verificado',
      confidenceScore: 50,
      createdBy: 'u1',
      createdAt: new Date().toISOString().split('T')[0],
    };

    MOCK_VENUES.push(newVenue);

    const newTable: VenueTable = {
      id: `t_${Date.now()}`,
      venueId: newId,
      brand: venueForm.tableBrand,
      quantity: parseInt(venueForm.tableQuantity) || 1,
      photos: [],
    };
    MOCK_TABLES.push(newTable);

    setVenueForm({ name: '', city: '', address: '', description: '', tableBrand: 'Presas', tableQuantity: '1', observations: '' });
    setShowAddVenue(false);
    toast.success('¡Local añadido correctamente!');
    forceUpdate(n => n + 1);
  };

  return (
    <div className="relative h-screen w-full">
      {/* Search bar overlay */}
      <div className="absolute left-0 right-0 top-0 z-[1000] px-3 pt-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar local o ciudad..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl bg-card/95 py-3 pl-10 pr-4 text-sm shadow-elevated backdrop-blur-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-xl p-3 shadow-elevated transition active:scale-95 ${showFilters ? 'bg-primary text-primary-foreground' : 'bg-card/95 backdrop-blur-md text-foreground'}`}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowList(!showList)}
            className={`rounded-xl p-3 shadow-elevated transition active:scale-95 ${showList ? 'bg-primary text-primary-foreground' : 'bg-card/95 backdrop-blur-md text-foreground'}`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>

        {showFilters && (
          <div className="mt-2 rounded-xl bg-card/95 p-3 shadow-elevated backdrop-blur-md animate-slide-up">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de mesa</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedBrand(null)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${!selectedBrand ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                Todas
              </button>
              {TABLE_BRANDS.map(brand => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${selectedBrand === brand ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <MapContainer
        center={SPAIN_CENTER}
        zoom={SPAIN_ZOOM}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredVenues.map(venue => {
          const table = getTableForVenue(venue.id);
          const brand = table?.brand || 'Otro';
          return (
            <Marker
              key={venue.id}
              position={[venue.lat, venue.lng]}
              icon={markerIcons[brand]}
              eventHandlers={{
                click: () => setSelectedVenue(venue),
              }}
            />
          );
        })}
        <LocateButton />
      </MapContainer>

      {/* FAB - Add venue */}
      <button
        onClick={() => setShowAddVenue(true)}
        className="absolute bottom-36 right-3 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-secondary shadow-elevated text-secondary-foreground transition hover:opacity-90 active:scale-90"
        aria-label="Añadir local"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Venue preview sheet */}
      {selectedVenue && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
          <div className="mx-3 mb-20 rounded-xl bg-card p-4 shadow-elevated">
            <button onClick={() => setSelectedVenue(null)} className="absolute right-5 top-5">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
            <Link to={`/locales/${selectedVenue.id}`}>
              <VenueCard venue={selectedVenue} table={getTableForVenue(selectedVenue.id)} />
            </Link>
          </div>
        </div>
      )}

      {/* List view overlay */}
      {showList && (
        <div className="absolute inset-0 z-[999] bg-background/95 backdrop-blur-sm overflow-auto pt-20 pb-24 px-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{filteredVenues.length} locales</h2>
              <button onClick={() => setShowList(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            {filteredVenues.map(v => (
              <Link key={v.id} to={`/locales/${v.id}`}>
                <VenueCard
                  venue={v}
                  table={getTableForVenue(v.id)}
                  onClick={() => {
                    setSelectedVenue(v);
                    setShowList(false);
                  }}
                />
              </Link>
            ))}
            {filteredVenues.length === 0 && (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                No se encontraron locales con estos filtros
              </p>
            )}
          </div>
        </div>
      )}

      {/* ADD VENUE DIALOG */}
      {showAddVenue && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Añadir local</h3>
              <button onClick={() => setShowAddVenue(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre del bar/local *</label>
                <input
                  className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Bar El Rincón"
                  value={venueForm.name}
                  onChange={e => setVenueForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ciudad *</label>
                <input
                  className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Madrid"
                  value={venueForm.city}
                  onChange={e => setVenueForm(f => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dirección (opcional)</label>
                <input
                  className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="C/ Gran Vía 42"
                  value={venueForm.address}
                  onChange={e => setVenueForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción (opcional)</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Ambiente, horarios, etc."
                  value={venueForm.description}
                  onChange={e => setVenueForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tipo de mesa principal</label>
                <div className="flex flex-wrap gap-1.5">
                  {TABLE_BRANDS.map(brand => (
                    <button
                      key={brand}
                      onClick={() => setVenueForm(f => ({ ...f, tableBrand: brand }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${venueForm.tableBrand === brand ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Número de mesas</label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={venueForm.tableQuantity}
                  onChange={e => setVenueForm(f => ({ ...f, tableQuantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observaciones (opcional)</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Notas adicionales..."
                  value={venueForm.observations}
                  onChange={e => setVenueForm(f => ({ ...f, observations: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowAddVenue(false)}
                className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddVenue}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Guardar local
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
