import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Hero from '@/components/Hero';
import FeaturedSection from '@/components/FeaturedSection';
import { useAuth } from "@/contexts/AuthContext";
import LocationSearch from '@/components/search/LocationSearch';

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <MainLayout>
      <Hero />
      <LocationSearch />
      <div className="space-y-16">
        <FeaturedSection />

        {/* Host CTA Section */}
        <section className="bg-gradient-to-r from-amber-500 to-terracotta-600 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-4xl font-bold mb-6">Share Your Culture With The World</h2>
              <p className="text-xl mb-8 opacity-90">
                Whether it's your culinary expertise or your unique space, become a host and start earning while creating memorable experiences.
              </p>
              <div className="flex gap-4 justify-center">
                {user?.is_host ? (
                  <Link to="/host/dashboard">
                    <Button variant="secondary" size="lg">
                      Go to Host Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link to="/become-host">
                    <Button variant="secondary" size="lg">
                      Become a Host
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-transparent text-white border-white hover:bg-white/10"
                  onClick={() => navigate('/host/stay')}
                >
                  List Your Space
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default Index;