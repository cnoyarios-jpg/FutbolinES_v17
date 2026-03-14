import { Venue, VenueTable } from '@/types';
import { MapPin, Check, AlertTriangle, HelpCircle } from 'lucide-react';

interface VenueCardProps {
  venue: Venue;
  table?: VenueTable;
  compact?: boolean;
  onClick?: () => void;
}

const verificationConfig: Record<string, { icon: typeof Check; label: string; className: string }> = {
  verificado: { icon: Check, label: 'Verificado', className: 'bg-success/10 text-success' },
  no_verificado: { icon: HelpCircle, label: 'Sin verificar', className: 'bg-muted text-muted-foreground' },
  en_disputa: { icon: AlertTriangle, label: 'En disputa', className: 'bg-warning/10 text-warning-foreground' },
};

export default function VenueCard({ venue, table, compact, onClick }: VenueCardProps) {
  const verification = verificationConfig[venue.verificationLevel] || verificationConfig.no_verificado;
  const VerIcon = verification.icon;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-card p-4 shadow-card transition-all hover:shadow-elevated active:scale-[0.98] border border-border/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-card-foreground truncate">{venue.name}</h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span className="truncate">{venue.city}</span>
          </div>
          {!compact && (
            <p className="mt-1 text-xs text-muted-foreground/80 truncate">{venue.address}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {table && (
            <span className="rounded-xl bg-primary/8 px-2.5 py-1 text-[10px] font-bold text-primary">
              {table.brand} ({table.quantity})
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold ${verification.className}`}>
            <VerIcon className="h-3 w-3" />
            {verification.label}
          </span>
        </div>
      </div>
    </button>
  );
}
