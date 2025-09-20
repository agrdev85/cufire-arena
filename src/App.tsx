import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import Footer from "@/components/Footer";
import Hero from '@/components/Hero';
import Tournaments from '@/components/Tournaments';
import Leaderboard from '@/components/Leaderboard';
import Prizes from '@/components/Prizes';
import { AuthModal } from '@/components/AuthModal';
import AdminPanel from '@/pages/AdminPanel';
import ProfilePanel from '@/components/ProfilePanel';

function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Header />
        <Routes>
          <Route path="/" element={
            <main>
              <Hero />
              <Tournaments />
              <Leaderboard />
              <Prizes />
              <Footer />
            </main>
          } />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/profile" element={<ProfilePanel />} />
        </Routes>
        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => setAuthModalOpen(false)}
        />
        <Toaster />
      </div>
    </Router>
  );
}
export default App;