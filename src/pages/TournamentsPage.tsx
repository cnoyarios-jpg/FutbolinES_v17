import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import PageShell from '@/components/PageShell';
import TournamentCard from '@/components/TournamentCard';
import { MOCK_TOURNAMENTS } from '@/data/mock';

export default function TournamentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const filtered = MOCK_TOURNAMENTS.filter(t => {
    if (search) {
      const s = search.toLowerCase();
      if (!t.name.toLowerCase().includes(s) && !t.city.toLowerCase().includes(s)) return false;
    }
    if (statusFilter !== 'todos' && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <PageShell title="Torneos">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Buscar torneo..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'abierto', label: 'Abiertos' },
          { key: 'en_curso', label: 'En curso' },
          { key: 'finalizado', label: 'Finalizados' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${statusFilter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {filtered.map(t => (
          <Link key={t.id} to={`/torneos/${t.id}`}>
            <TournamentCard tournament={t} />
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">No se encontraron torneos</p>
        )}
      </div>
      <Link to="/torneos/crear" className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-secondary shadow-elevated text-secondary-foreground transition hover:opacity-90 active:scale-90">
        <Plus className="h-6 w-6" />
      </Link>
    </PageShell>
  );
}
