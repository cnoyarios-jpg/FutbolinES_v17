import { useState, useMemo } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { MOCK_VENUES, MOCK_TABLES, getTableForVenue, TABLE_CONDITION_LABELS, TABLE_CONDITION_COLORS, getLocationFromPostalCode } from '@/data/mock';
import VenueCard from '@/components/VenueCard';
import PageShell from '@/components/PageShell';
import { TableBrand, TableCondition, Venue, VenueTable } from '@/types';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const TABLE_BRANDS: TableBrand[] = ['Presas', 'Tsunami', 'Infinity', 'Val', 'Garlando', 'Leonhart', 'Tornado', 'Otro'];
const TABLE_CONDITIONS: TableCondition[] = ['perfecta', 'buen_estado', 'estado_normal', 'deteriorada', 'fuera_de_servicio'];

export default function FutbolinesPage() {
  const [search, setSearch] = useState('');
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [, forceUpdate] = useState(0);

  const [venueForm, setVenueForm] = useState({
    name: '', postalCode: '', address: '', description: '',
    tableBrand: 'Presas' as TableBrand,
    tableQuantity: '1',
    tableCondition: 'buen_estado' as TableCondition,
  });

  const derivedLocation = venueForm.postalCode.length === 5 ? getLocationFromPostalCode(venueForm.postalCode) : null;
  const derivedCity = derivedLocation?.city || '';

  const filteredVenues = useMemo(() => {
    return MOCK_VENUES.filter(v => {
      if (search) {
        const s = search.toLowerCase();
        if (!v.city.toLowerCase().includes(s) && !v.name.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [search]);

  const handleAddVenue = () => {
    if (!venueForm.name.trim()) { toast.error('El nombre del local es obligatorio'); return; }
    if (!venueForm.postalCode.trim() || !/^\d{5}$/.test(venueForm.postalCode.trim())) { toast.error('El código postal debe ser exactamente 5 dígitos'); return; }

    if (!derivedLocation?.province) { toast.error('No se encontró provincia para ese código postal'); return; }

    const newId = `v_${Date.now()}`;
    const newVenue: Venue = {
      id: newId, name: venueForm.name, address: venueForm.address || '', city: derivedLocation?.province ? `Provincia de ${derivedLocation.province}` : '',
      postalCode: venueForm.postalCode.trim(), province: derivedLocation?.province,
      photos: [], description: venueForm.description || undefined,
      status: 'activo', verificationLevel: 'no_verificado', confidenceScore: 50,
      verificationCount: 0, createdBy: 'u1', createdAt: new Date().toISOString().split('T')[0],
    };
    MOCK_VENUES.push(newVenue);

    const newTable: VenueTable = {
      id: `t_${Date.now()}`, venueId: newId, brand: venueForm.tableBrand,
      quantity: parseInt(venueForm.tableQuantity) || 1, condition: venueForm.tableCondition, photos: [],
    };
    MOCK_TABLES.push(newTable);

    setVenueForm({ name: '', postalCode: '', address: '', description: '', tableBrand: 'Presas', tableQuantity: '1', tableCondition: 'buen_estado' });
    setShowAddVenue(false);
    toast.success('¡Futbolín añadido correctamente!');
    forceUpdate(n => n + 1);
  };

  return (
    <PageShell title="Futbolines">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Buscar por ciudad o nombre..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        {search && (<button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>)}
      </div>

      {search && (<p className="mb-3 text-xs text-muted-foreground">{filteredVenues.length} resultado{filteredVenues.length !== 1 ? 's' : ''} para "{search}"</p>)}

      <div className="flex flex-col gap-3">
        {filteredVenues.map(v => (
          <Link key={v.id} to={`/locales/${v.id}`}>
            <VenueCard venue={v} table={getTableForVenue(v.id)} />
          </Link>
        ))}
        {filteredVenues.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">No se encontraron futbolines{search ? ` en "${search}"` : ''}</p>
        )}
      </div>

      <button onClick={() => setShowAddVenue(true)} className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-secondary shadow-elevated text-secondary-foreground transition hover:opacity-90 active:scale-90" aria-label="Añadir futbolín">
        <Plus className="h-6 w-6" />
      </button>

      {showAddVenue && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Añadir futbolín</h3>
              <button onClick={() => setShowAddVenue(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre del bar/local *</label>
                <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: Bar El Rincón" value={venueForm.name} onChange={e => setVenueForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código Postal *</label>
                <input className={`mt-1 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${venueForm.postalCode.trim() && !/^\d{5}$/.test(venueForm.postalCode.trim()) ? 'border-destructive' : 'border-input'} bg-card`} placeholder="Ej: 36600" value={venueForm.postalCode} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 5); setVenueForm(f => ({ ...f, postalCode: val })); }} maxLength={5} inputMode="numeric" />
                {venueForm.postalCode.trim() && !/^\d{5}$/.test(venueForm.postalCode.trim()) && (<p className="mt-1 text-xs text-destructive">Debe ser exactamente 5 dígitos</p>)}
                {derivedCity && venueForm.postalCode.length === 5 && (
                  <p className="mt-1 text-xs text-success font-medium">📍 {derivedCity}{derivedLocation?.province ? ` (${derivedLocation.province})` : ''}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dirección (opcional)</label>
                <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="C/ Gran Vía 42" value={venueForm.address} onChange={e => setVenueForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción (opcional)</label>
                <textarea className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={2} placeholder="Ambiente, horarios, etc." value={venueForm.description} onChange={e => setVenueForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tipo de mesa principal</label>
                <div className="flex flex-wrap gap-1.5">
                  {TABLE_BRANDS.map(brand => (
                    <button key={brand} onClick={() => setVenueForm(f => ({ ...f, tableBrand: brand }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${venueForm.tableBrand === brand ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{brand}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Número de mesas</label>
                <input type="number" min={1} className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={venueForm.tableQuantity} onChange={e => setVenueForm(f => ({ ...f, tableQuantity: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Estado de la mesa</label>
                <div className="flex flex-wrap gap-1.5">
                  {TABLE_CONDITIONS.map(condition => (
                    <button key={condition} onClick={() => setVenueForm(f => ({ ...f, tableCondition: condition }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${venueForm.tableCondition === condition ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{TABLE_CONDITION_LABELS[condition]}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowAddVenue(false)} className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleAddVenue} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
