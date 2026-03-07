import { useParams, Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { MOCK_VENUES, MOCK_TABLES, MOCK_TOURNAMENTS, getTableForVenue } from '@/data/mock';
import { MapPin, CheckCircle, AlertTriangle, Clock, Trophy, ArrowLeft } from 'lucide-react';

const verificationLabels: Record<string, string> = { verificado: 'Verificado', no_verificado: 'Sin verificar', en_disputa: 'En disputa' };
const statusLabels: Record<string, string> = { activo: 'Activo', pendiente: 'Pendiente', cambiado: 'Cambiado', cerrado_temporal: 'Cerrado temporalmente', cerrado: 'Cerrado' };

export default function VenueDetailPage() {
  const { id } = useParams();
  const venue = MOCK_VENUES.find(v => v.id === id);
  const table = venue ? getTableForVenue(venue.id) : undefined;
  const venueTournaments = MOCK_TOURNAMENTS.filter(t => t.venueId === id);

  if (!venue) {
    return (<PageShell title="Local no encontrado"><p className="text-center text-muted-foreground mt-8">Este local no existe.</p><Link to="/mapa" className="mt-4 block text-center text-sm text-primary font-medium">Volver al mapa</Link></PageShell>);
  }

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-4">
        <Link to="/mapa" className="rounded-lg bg-muted p-2"><ArrowLeft className="h-5 w-5 text-muted-foreground" /></Link>
        <h1 className="font-display text-xl font-bold truncate">{venue.name}</h1>
      </div>

      <div className="rounded-xl bg-card p-4 shadow-card mb-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span>{venue.address}, {venue.city}</span></div>
          <div className="flex items-center gap-2">
            {venue.verificationLevel === 'verificado' ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" /> : venue.verificationLevel === 'en_disputa' ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
            <span>{verificationLabels[venue.verificationLevel]}</span>
            <span className="text-xs">· {statusLabels[venue.status]}</span>
          </div>
        </div>
        {venue.description && <p className="mt-3 text-sm border-t border-border pt-3">{venue.description}</p>}
        {venue.observations && <p className="mt-2 text-xs text-muted-foreground italic">{venue.observations}</p>}
      </div>

      {table && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-2">Mesa</h3>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{table.brand}</span>
            <span className="text-sm text-muted-foreground">{table.quantity} mesa{table.quantity > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {venueTournaments.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5"><Trophy className="h-4 w-4" /> Torneos en este local</h3>
          <div className="flex flex-col gap-2">
            {venueTournaments.map(t => (
              <Link key={t.id} to={`/torneos/${t.id}`} className="flex items-center justify-between rounded-lg bg-muted p-3 hover:bg-muted/80 transition">
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className="text-xs text-primary font-medium capitalize">{t.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
