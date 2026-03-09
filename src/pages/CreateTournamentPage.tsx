import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { ChevronRight, ChevronLeft, MapPin, AlertCircle } from 'lucide-react';
import { TableBrand, PlayStyle, TournamentFormat, PairingMode, Tournament } from '@/types';
import { MOCK_TOURNAMENTS, MOCK_VENUES, MOCK_USER, getCurrentUser, persistTournaments } from '@/data/mock';
import { toast } from 'sonner';
import { VenueSearchCombobox } from '@/components/VenueSearchCombobox';

const STEPS = ['Información', 'Formato', 'Estilo', 'Localización', 'Inscripción', 'Premios', 'Vista previa'];
const TABLE_BRANDS: TableBrand[] = ['Presas', 'Tsunami', 'Infinity', 'Val', 'Garlando', 'Leonhart', 'Tornado', 'Otro'];
const FORMATS: { key: TournamentFormat; label: string }[] = [
  { key: 'eliminacion_simple', label: 'Eliminación simple' },
  { key: 'eliminacion_doble', label: 'Eliminación doble' },
  { key: 'round_robin', label: 'Round Robin / Liguilla' },
  { key: 'grupos_cuadro', label: 'Grupos + Cuadro final' },
  { key: 'rey_mesa', label: 'Rey de la mesa' },
];
const PAIRING_MODES: { key: PairingMode; label: string; desc: string }[] = [
  { key: 'inscripcion', label: 'Por inscripción', desc: 'Las parejas vienen formadas' },
  { key: 'equilibradas', label: 'Parejas equilibradas', desc: 'La app crea parejas por ELO' },
  { key: 'random', label: 'Random', desc: 'Parejas completamente aleatorias' },
];

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Get active venues for selection
  const activeVenues = MOCK_VENUES.filter(v => v.status === 'activo' || v.status === 'pendiente');

  const [form, setForm] = useState({
    name: '', description: '', date: '', time: '',
    venueId: '',
    tableBrand: 'Presas' as TableBrand, playStyle: 'parado' as PlayStyle,
    format: 'eliminacion_simple' as TournamentFormat, pairingMode: 'inscripcion' as PairingMode,
    maxPairs: 16, entryFee: '', prizes: '',
    requiresApproval: false,
  });
  const update = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  // Get selected venue info
  const selectedVenue = MOCK_VENUES.find(v => v.id === form.venueId);

  const handleCreateTournament = () => {
    if (!form.name.trim()) { toast.error('El nombre del torneo es obligatorio'); return; }
    if (!form.venueId) { toast.error('Debes seleccionar un local registrado'); return; }
    
    const organizer = getCurrentUser() || MOCK_USER;
    const venue = MOCK_VENUES.find(v => v.id === form.venueId);
    if (!venue) { toast.error('Local no encontrado'); return; }

    const newId = `to_${Date.now()}`;
    const newTournament: Tournament = {
      id: newId, name: form.name, description: form.description,
      date: form.date || new Date().toISOString().split('T')[0], time: form.time || '18:00',
      venueId: form.venueId, venueName: venue.name, city: venue.city,
      tableBrand: form.tableBrand, playStyle: form.playStyle, format: form.format,
      pairingMode: form.pairingMode, maxPairs: form.maxPairs, hasWaitlist: false,
      entryFee: form.entryFee ? parseInt(form.entryFee) : undefined, prizes: form.prizes || undefined,
      organizerId: organizer.id, organizerName: organizer.displayName, requiresApproval: form.requiresApproval,
      status: 'abierto', hasCategories: false, categories: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    MOCK_TOURNAMENTS.push(newTournament);
    persistTournaments();
    toast.success('¡Torneo creado correctamente!');
    navigate(`/torneos/${newId}`);
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre del torneo</label>
            <input className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: Torneo Gran Vía" value={form.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</label>
              <input type="date" className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.date} onChange={e => update('date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hora</label>
              <input type="time" className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.time} onChange={e => update('time', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</label>
            <textarea className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={4} placeholder="Reglas, premios..." value={form.description} onChange={e => update('description', e.target.value)} />
          </div>
        </div>
      );
      case 1: return (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Formato del torneo</p>
          {FORMATS.map(f => (
            <button key={f.key} onClick={() => update('format', f.key)} className={`rounded-lg border p-3 text-left text-sm font-medium transition ${form.format === f.key ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{f.label}</button>
          ))}
        </div>
      );
      case 2: return (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estilo de juego</p>
            <div className="flex gap-2">
              {(['parado', 'movimiento'] as PlayStyle[]).map(s => (
                <button key={s} onClick={() => update('playStyle', s)} className={`flex-1 rounded-lg border p-3 text-center text-sm font-semibold capitalize transition ${form.playStyle === s ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground'}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="flex flex-col gap-4">
          {activeVenues.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">No hay locales registrados</p>
                  <p className="text-sm text-muted-foreground mt-1">Para crear un torneo, primero debes registrar un local con futbolín.</p>
                  <Link to="/futbolines" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    <MapPin className="h-4 w-4" /> Ir a registrar un local
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Buscar local</label>
                <VenueSearchCombobox 
                  value={form.venueId} 
                  onValueChange={(venueId) => update('venueId', venueId)}
                  placeholder="Escribe para buscar un local..."
                />
              </div>
              {selectedVenue && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 mt-4">
                  <p className="text-sm font-medium">{selectedVenue.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedVenue.address}, {selectedVenue.city}</p>
                </div>
              )}
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tipo de mesa</p>
                <div className="flex flex-wrap gap-1.5">
                  {TABLE_BRANDS.map(b => (
                    <button key={b} onClick={() => update('tableBrand', b)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${form.tableBrand === b ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{b}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      );
      case 4: return (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nº máximo de parejas</label>
            <input type="number" min={2} className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.maxPairs} onChange={e => update('maxPairs', parseInt(e.target.value) || 2)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Modo de parejas</p>
            {PAIRING_MODES.map(m => (
              <button key={m.key} onClick={() => update('pairingMode', m.key)} className={`mb-2 w-full rounded-lg border p-3 text-left transition ${form.pairingMode === m.key ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <p className={`text-sm font-semibold ${form.pairingMode === m.key ? 'text-primary' : 'text-foreground'}`}>{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.requiresApproval} onChange={e => update('requiresApproval', e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
            Requiere aprobación del organizador
          </label>
        </div>
      );
      case 5: return (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio de inscripción (€)</label>
            <input type="number" className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Opcional" value={form.entryFee} onChange={e => update('entryFee', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Premios</label>
            <textarea className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" rows={3} placeholder="1º: 100€ | 2º: 50€" value={form.prizes} onChange={e => update('prizes', e.target.value)} />
          </div>
        </div>
      );
      case 6: return (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-card p-4 shadow-card">
            <h3 className="font-display text-lg font-bold">{form.name || 'Sin nombre'}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">{form.tableBrand}</span>
              <span className="rounded-md bg-accent/30 px-2 py-0.5 font-semibold text-accent-foreground capitalize">{form.playStyle}</span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{FORMATS.find(f => f.key === form.format)?.label}</span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>📅 {form.date || '—'} · {form.time || '—'}</p>
              <p>📍 {selectedVenue?.name || '—'}, {selectedVenue?.city || '—'}</p>
              <p>👥 {form.maxPairs} parejas máx.</p>
              {form.entryFee && <p>💰 {form.entryFee}€</p>}
            </div>
            {form.description && <p className="mt-3 text-sm text-foreground">{form.description}</p>}
          </div>
          <button onClick={handleCreateTournament} disabled={!form.venueId} className="w-full rounded-xl bg-secondary py-3 text-center font-display font-semibold text-secondary-foreground transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            Crear torneo
          </button>
        </div>
      );
      default: return null;
    }
  };

  // Disable "Next" on step 3 (Localización) if no venue selected and there are venues available
  const canProceed = step !== 3 || activeVenues.length === 0 || form.venueId;

  return (
    <PageShell title="Crear torneo">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-primary">{STEPS[step]}</span>
          <span className="text-xs text-muted-foreground">{step + 1}/{STEPS.length}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>
      {renderStep()}
      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground transition active:scale-95">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button 
            onClick={() => setStep(s => s + 1)} 
            disabled={!canProceed}
            className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </PageShell>
  );
}
