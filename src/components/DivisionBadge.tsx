import { Shield, Swords, ShieldCheck, Gem, Medal, Crown, Sparkles, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDivision } from '@/lib/divisions';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'shield': Shield,
  'swords': Swords,
  'shield-check': ShieldCheck,
  'gem': Gem,
  'medal': Medal,
  'crown': Crown,
  'sparkles': Sparkles,
  'flame': Flame,
};

export function DivisionIcon({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = ICON_MAP[iconName] || Shield;
  return <Icon className={cn('h-3.5 w-3.5', className)} />;
}

export function DivisionBadge({ elo, showFullName = false, size = 'sm' }: { elo: number; showFullName?: boolean; size?: 'xs' | 'sm' | 'md' }) {
  const div = getDivision(elo);
  const sizeClasses = { xs: 'text-[9px]', sm: 'text-[10px]', md: 'text-xs' };
  const iconSizes = { xs: 'h-3 w-3', sm: 'h-3.5 w-3.5', md: 'h-4 w-4' };
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold border border-current/10',
      div.bgClass, div.colorClass, sizeClasses[size]
    )}>
      <DivisionIcon iconName={div.iconName} className={iconSizes[size]} />
      {showFullName ? div.fullName : div.sublevel}
    </span>
  );
}
