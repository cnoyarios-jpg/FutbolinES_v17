import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageShell from '@/components/PageShell';
import { MOCK_VENUES, MOCK_TABLES, MOCK_TOURNAMENTS, getTableForVenue, getVenueTopPlayers, getVenueAvgLevel, getVenueMostCommonStyle, getVenueVerifications, verifyVenue, getVenueLeagues, createVenueLeague, getLeagueStandings, addTournamentToLeague, getCurrentUser } from '@/data/mock';
import { MapPin, CheckCircle, AlertTriangle, Clock, Trophy, ArrowLeft, ShieldCheck, ShieldAlert, XCircle, Plus, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const verificationLabels: Record<string, string> = { verificado: 'Verificado', no_verificado: 'Sin verificar', en_disputa: 'En disputa' };
const statusLabels: Record<string, string> = { activo: 'Activo', pendiente: 'Pendiente', cambiado: 'Cambiado', cerrado_temporal: 'Cerrado temporalmente', cerrado: 'Cerrado' };

export default function VenueDetailPage() {
  const { id } = useParams();
  const venue = MOCK_VENUES.find(v => v.id === id);
  const table = venue ? getTableForVenue(venue.id) : undefined;
  const venueTournaments = MOCK_TOURNAMENTS.filter(t => t.venueId === id);
  const [, forceUpdate] = useState(0);
  const [showNewLeague, setShowNewLeague] = useState(false);
  const [leagueName, setLeagueName] = useState('');

  const topPlayers = venue ? getVenueTopPlayers(venue.id) : [];
  const avgLevel = venue ? getVenueAvgLevel(venue.id) : 0;
  const commonStyle = venue ? getVenueMostCommonStyle(venue.id) : null;
  const verifications = venue ? getVenueVerifications(venue.id) : [];
  const leagues = venue ? getVenueLeagues(venue.id) : [];
  const currentUser = getCurrentUser();

  if (!venue) {
    return (<PageShell title="Local no encontrado"><p className="text-center text-muted-foreground mt-8">Este local no existe.</p><Link to="/futbolines" className="mt-4 block text-center text-sm text-primary font-medium">Volver a futbolines</Link></PageShell>);
  }

  const handleVerify = (type: 'confirm' | 'report_worse' | 'report_closed') => {
    const result = verifyVenue(venue.id, type);
    if (result.success) {
      toast.success(type === 'confirm' ? '¡Verificado!' : type === 'report_worse' ? 'Estado reportado' : 'Marcado como cerrado');
      forceUpdate(n => n + 1);
    } else {
      toast.error(result.error || 'Error');
    }
  };

  const handleCreateLeague = () => {
    if (!leagueName.trim()) { toast.error('Nombre obligatorio'); return; }
    createVenueLeague(venue.id, leagueName);
    setLeagueName('');
    setShowNewLeague(false);
    toast.success('Liga creada');
    forceUpdate(n => n + 1);
  };

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-4">
        <Link to="/futbolines" className="rounded-lg bg-muted p-2"><ArrowLeft className="h-5 w-5 text-muted-foreground" /></Link>
        <h1 className="font-display text-xl font-bold truncate">{venue.name}</h1>
      </div>

      <div className="rounded-xl bg-card p-4 shadow-card mb-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span>{venue.address}, {venue.city}</span></div>
          <div className="flex items-center gap-2">
            {venue.verificationLevel === 'verificado' ? <CheckCircle className="h-4 w-4 text-success shrink-0" /> : venue.verificationLevel === 'en_disputa' ? <AlertTriangle className="h-4 w-4 text-warning shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
            <span>{verificationLabels[venue.verificationLevel]}</span>
            <span className="text-xs">· {statusLabels[venue.status]}</span>
          </div>
          {venue.lastVerified && <p className="text-xs">Última verificación: {venue.lastVerified}</p>}
        </div>
        
        {/* Verification reliability index */}
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-foreground">Índice de fiabilidad:</span>
            {(() => {
              const count = venue.verificationCount || 0;
              if (count >= 5) return <span className="rounded-full bg-success/10 px-2.5 py-0.5 font-bold text-success">🟢 Alta ({count} verificaciones)</span>;
              if (count >= 2) return <span className="rounded-full bg-warning/10 px-2.5 py-0.5 font-bold text-warning-foreground">🟡 Media ({count} verificaciones)</span>;
              return <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 font-bold text-destructive">🔴 Baja ({count} verificaciones)</span>;
            })()}
          </div>
        </div>
        
        {venue.description && <p className="mt-3 text-sm border-t border-border pt-3">{venue.description}</p>}
        {venue.observations && <p className="mt-2 text-xs text-muted-foreground italic">{venue.observations}</p>}
      </div>

      {/* Verification buttons */}
      {currentUser && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-3">Verificación semanal</h3>
          <div className="flex gap-2">
            <button onClick={() => handleVerify('confirm')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-success/10 py-2.5 text-xs font-semibold text-success transition active:scale-95">
              <ShieldCheck className="h-4 w-4" /> Existe
            </button>
            <button onClick={() => handleVerify('report_worse')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-warning/10 py-2.5 text-xs font-semibold text-warning-foreground transition active:scale-95">
              <ShieldAlert className="h-4 w-4" /> Estado peor
            </button>
            <button onClick={() => handleVerify('report_closed')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 py-2.5 text-xs font-semibold text-destructive transition active:scale-95">
              <XCircle className="h-4 w-4" /> No existe
            </button>
          </div>
        </div>
      )}

      {table && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-2">Mesa</h3>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{table.brand}</span>
            <span className="text-sm text-muted-foreground">{table.quantity} mesa{table.quantity > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      {(topPlayers.length > 0 || avgLevel > 0) && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5"><BarChart3 className="h-4 w-4" /> Estadísticas</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {avgLevel > 0 && (
              <div className="rounded-lg bg-muted p-2.5 text-center">
                <p className="font-display text-lg font-bold text-primary">{avgLevel}</p>
                <p className="text-[10px] text-muted-foreground">ELO medio</p>
              </div>
            )}
            {commonStyle && (
              <div className="rounded-lg bg-muted p-2.5 text-center">
                <p className="font-display text-lg font-bold">{commonStyle}</p>
                <p className="text-[10px] text-muted-foreground">Estilo más jugado</p>
              </div>
            )}
          </div>
          {topPlayers.length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Top jugadores</p>
              <div className="flex flex-col gap-1.5">
                {topPlayers.map((p, i) => (
                  <Link key={p.userId} to={`/perfil/${p.userId}`} className="flex items-center justify-between rounded-lg bg-muted p-2.5 text-xs hover:bg-muted/80 transition">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{i + 1}</span>
                      <span className="font-medium">{p.displayName}</span>
                    </div>
                    <span className="font-bold">{p.elo}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Venue Leagues */}
      <div className="rounded-xl bg-card p-4 shadow-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold flex items-center gap-1.5"><Trophy className="h-4 w-4" /> Ligas del bar</h3>
          <button onClick={() => setShowNewLeague(true)} className="flex items-center gap-1 text-xs font-semibold text-primary">
            <Plus className="h-3.5 w-3.5" /> Nueva liga
          </button>
        </div>
        {leagues.length > 0 ? (
          <div className="flex flex-col gap-3">
            {leagues.map(league => {
              const standings = getLeagueStandings(league.id);
              const leagueTournamentIds = new Set(league.tournamentIds);
              const availableTournaments = venueTournaments.filter(t => !leagueTournamentIds.has(t.id));
              return (
                <div key={league.id} className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-semibold mb-2">{league.name}</p>
                  <p className="text-[10px] text-muted-foreground mb-1">{league.tournamentIds.length} torneo(s) asociado(s)</p>
                  {standings.length > 0 && (
                    <div className="flex flex-col gap-1 mb-2">
                      {standings.slice(0, 5).map((s, i) => (
                        <div key={s.userId} className="flex items-center justify-between text-xs">
                          <span><span className="font-bold text-primary mr-1">{i + 1}.</span>{s.displayName}</span>
                          <span className="font-semibold">{s.points} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {availableTournaments.length > 0 && (
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Añadir torneo a la liga</p>
                      <div className="flex flex-col gap-1">
                        {availableTournaments.map(t => (
                          <button key={t.id} onClick={() => {
                            addTournamentToLeague(league.id, t.id);
                            toast.success(`Torneo "${t.name}" añadido a la liga`);
                            forceUpdate(n => n + 1);
                          }} className="flex items-center justify-between rounded bg-card px-2.5 py-1.5 text-xs hover:bg-primary/5 transition">
                            <span className="font-medium">{t.name}</span>
                            <span className="text-primary text-[10px]">+ Añadir</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No hay ligas creadas para este bar.</p>
        )}
      </div>

      {showNewLeague && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-elevated">
            <h3 className="font-display text-lg font-bold mb-4">Nueva liga</h3>
            <input className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Nombre de la liga" value={leagueName} onChange={e => setLeagueName(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowNewLeague(false)} className="flex-1 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleCreateLeague} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Crear</button>
            </div>
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

      {/* Recent verifications */}
      {verifications.length > 0 && (
        <div className="rounded-xl bg-card p-4 shadow-card mb-4">
          <h3 className="font-display text-sm font-semibold mb-3">Verificaciones recientes</h3>
          <div className="flex flex-col gap-1.5">
            {verifications.slice(0, 5).map(v => (
              <div key={v.id} className="flex items-center justify-between rounded-lg bg-muted p-2.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={v.type === 'confirm' ? 'text-success' : v.type === 'report_worse' ? 'text-warning-foreground' : 'text-destructive'}>
                    {v.type === 'confirm' ? '✓' : v.type === 'report_worse' ? '⚠' : '✗'}
                  </span>
                  <span className="font-medium">{v.userName}</span>
                </div>
                <span className="text-muted-foreground">{new Date(v.createdAt).toLocaleDateString('es-ES')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
