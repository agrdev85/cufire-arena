import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Tournaments from '@/components/Tournaments';
import Leaderboard from '@/components/Leaderboard';
import Prizes from '@/components/Prizes';
import AuthModal from '@/components/AuthModal';
import Admin from '@/pages/Admin';

function App() {
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
            </main>
          } />
          <Route path="/admin" element={<Admin />} />
        </Routes>
        <AuthModal />
        <Toaster />
      </div>
    </Router>
  );
}

export default App;