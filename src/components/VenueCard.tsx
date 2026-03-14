import { Venue, VenueTable } from '@/types';
import { MapPin } from 'lucide-react';

interface VenueCardProps {
  venue: Venue;
  table?: VenueTable;
  compact?: boolean;
  onClick?: () => void;
}

const verificationColors: Record<string, string> = {
  verificado: 'bg-success/15 text-success border border-success/20',
  no_verificado: 'bg-muted text-muted-foreground',
  en_disputa: 'bg-warning/15 text-warning-foreground border border-warning/20',
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
      className="w-full text-left rounded-xl bg-card p-4 shadow-card transition-all hover:shadow-elevated active:scale-[0.98] border border-border/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-card-foreground truncate">{venue.name}</h3>
          <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{venue.city}</span>
          </div>
          {!compact && (
            <p className="mt-1 text-xs text-muted-foreground truncate">{venue.address}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {table && (
            <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {table.brand} ({table.quantity})
            </span>
          )}
          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${verificationColors[venue.verificationLevel]}`}>
            {verificationLabels[venue.verificationLevel]}
          </span>
        </div>
      </div>
    </button>
  );
}
