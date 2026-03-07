import { Venue, VenueTable } from '@/types';
import { MapPin } from 'lucide-react';

interface VenueCardProps {
  venue: Venue;
  table?: VenueTable;
  compact?: boolean;
  onClick?: () => void;
}

const statusLabels: Record<string, string> = {
  activo: 'Activo',
  pendiente: 'Pendiente',
  cambiado: 'Cambiado',
  cerrado_temporal: 'Cerrado temp.',
  cerrado: 'Cerrado',
};

const verificationColors: Record<string, string> = {
  verificado: 'bg-success text-success-foreground',
  no_verificado: 'bg-muted text-muted-foreground',
  en_disputa: 'bg-warning text-warning-foreground',
};

const verificationLabels: Record<string, string> = {
  verificado: 'Verificado',
  no_verificado: 'Sin verificar',
  en_disputa: 'En disputa',
};

export default function VenueCard({ venue, table, compact, onClick }: VenueCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg bg-card p-4 shadow-card transition-all hover:shadow-elevated active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-card-foreground truncate">{venue.name}</h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{venue.city}</span>
          </div>
          {!compact && (
            <p className="mt-1 text-xs text-muted-foreground truncate">{venue.address}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {table && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {table.brand} ({table.quantity})
            </span>
          )}
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${verificationColors[venue.verificationLevel]}`}>
            {verificationLabels[venue.verificationLevel]}
          </span>
        </div>
      </div>
    </button>
  );
}
