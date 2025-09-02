import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Tournaments from "@/components/Tournaments";
import Leaderboard from "@/components/Leaderboard";
import Footer from "@/components/Footer";
import Prizes from "@/components/Prizes";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Tournaments />
      <Leaderboard />
      <Prizes />
      <Footer />
    </div>
  );
};

export default Index;
