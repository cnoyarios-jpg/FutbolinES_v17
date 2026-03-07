import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import MapPage from "@/pages/MapPage";
import TournamentsPage from "@/pages/TournamentsPage";
import CreateTournamentPage from "@/pages/CreateTournamentPage";
import TournamentDetailPage from "@/pages/TournamentDetailPage";
import RankingsPage from "@/pages/RankingsPage";
import ProfilePage from "@/pages/ProfilePage";
import TeamsPage from "@/pages/TeamsPage";
import VenueDetailPage from "@/pages/VenueDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="mx-auto max-w-lg">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/mapa" element={<MapPage />} />
            <Route path="/torneos" element={<TournamentsPage />} />
            <Route path="/torneos/crear" element={<CreateTournamentPage />} />
            <Route path="/torneos/:id" element={<TournamentDetailPage />} />
            <Route path="/ranking" element={<RankingsPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/equipos" element={<TeamsPage />} />
            <Route path="/locales/:id" element={<VenueDetailPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
