import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import FutbolinesPage from "@/pages/FutbolinesPage";
import TournamentsPage from "@/pages/TournamentsPage";
import CreateTournamentPage from "@/pages/CreateTournamentPage";
import TournamentDetailPage from "@/pages/TournamentDetailPage";
import RankingsPage from "@/pages/RankingsPage";
import ProfilePage from "@/pages/ProfilePage";
import TeamsPage from "@/pages/TeamsPage";
import TeamLeaguePage from "@/pages/TeamLeaguePage";
import VenueDetailPage from "@/pages/VenueDetailPage";
import LoginPage from "@/pages/LoginPage";
import MyTeamPage from "@/pages/MyTeamPage";
import NotificationsPage from "@/pages/NotificationsPage";
import NotFound from "./pages/NotFound";
import { getCurrentUser, logoutUser } from "@/data/mock";

const queryClient = new QueryClient();

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getCurrentUser());

  if (!isLoggedIn) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <LoginPage onLogin={() => setIsLoggedIn(true)} />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="mx-auto max-w-lg">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/futbolines" element={<FutbolinesPage />} />
              <Route path="/torneos" element={<TournamentsPage />} />
              <Route path="/torneos/crear" element={<CreateTournamentPage />} />
              <Route path="/torneos/:id" element={<TournamentDetailPage />} />
              <Route path="/ranking" element={<RankingsPage />} />
              <Route path="/perfil" element={<ProfilePage onLogout={() => { logoutUser(); setIsLoggedIn(false); }} />} />
              <Route path="/perfil/:userId" element={<ProfilePage />} />
              <Route path="/equipos" element={<TeamsPage />} />
              <Route path="/equipos/ligas" element={<TeamLeaguePage />} />
              <Route path="/equipos/:teamId" element={<TeamsPage />} />
              <Route path="/locales/:id" element={<VenueDetailPage />} />
              <Route path="/mi-equipo" element={<MyTeamPage />} />
              <Route path="/notificaciones" element={<NotificationsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
