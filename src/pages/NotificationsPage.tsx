import { useState } from 'react';
import PageShell from '@/components/PageShell';
import {
  getCurrentUser, getNotifications, markNotificationRead,
  getUserPendingInvites, respondTeamInvite,
} from '@/data/mock';
import { Bell, Check, X, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const [, forceUpdate] = useState(0);
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return (
      <PageShell title="Notificaciones">
        <p className="text-sm text-muted-foreground text-center py-8">Inicia sesión para ver tus notificaciones.</p>
      </PageShell>
    );
  }

  const notifications = getNotifications(currentUser.id);
  const pendingInvites = getUserPendingInvites(currentUser.id);

  const handleAcceptInvite = (memberId: string) => {
    respondTeamInvite(memberId, true);
    toast.success('Invitación aceptada');
    forceUpdate(n => n + 1);
  };

  const handleRejectInvite = (memberId: string) => {
    respondTeamInvite(memberId, false);
    toast.success('Invitación rechazada');
    forceUpdate(n => n + 1);
  };

  const handleMarkRead = (notifId: string) => {
    markNotificationRead(notifId);
    forceUpdate(n => n + 1);
  };

  return (
    <PageShell title="Notificaciones">
      {/* Team invitations */}
      {pendingInvites.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Invitaciones de equipo
          </h3>
          <div className="flex flex-col gap-2">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="rounded-xl bg-card p-4 shadow-card">
                <p className="text-sm font-semibold">Invitación a <span className="text-primary">{invite.teamName}</span></p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAcceptInvite(invite.id)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-sm font-medium text-success">
                    <Check className="h-4 w-4" /> Aceptar
                  </button>
                  <button onClick={() => handleRejectInvite(invite.id)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-sm font-medium text-destructive">
                    <X className="h-4 w-4" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General notifications */}
      <div className="flex flex-col gap-2">
        {notifications.length === 0 && pendingInvites.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Bell className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No tienes notificaciones</p>
          </div>
        )}
        {notifications.map(n => (
          <div key={n.id} className={`rounded-xl p-4 shadow-card ${n.read ? 'bg-muted' : 'bg-card border-l-4 border-primary'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!n.read && (
                <button onClick={() => handleMarkRead(n.id)} className="rounded bg-muted p-1.5 text-muted-foreground hover:text-foreground transition">
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
