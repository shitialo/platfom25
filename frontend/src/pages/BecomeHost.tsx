import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, Home as HomeIcon, ArrowRight } from "lucide-react";

const BecomeHost = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<'food' | 'stay' | null>(null);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Share Your Passion with the World
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you're a culinary expert or have a unique space to share, join our community of hosts and start earning while creating memorable experiences.
          </p>
        </div>

        {/* Host Options */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Food Experience Host */}
          <Card
            className={`cursor-pointer transition-all duration-300 ${
              hoveredCard === 'food' ? 'shadow-lg scale-105' : ''
            }`}
            onMouseEnter={() => setHoveredCard('food')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => navigate("/host/food")}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <ChefHat className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-semibold">Food Experience Host</h2>
                <p className="text-muted-foreground">
                  Share your culinary expertise and cultural traditions through unique food experiences.
                </p>
                <ul className="text-left space-y-2">
                  <li className="flex items-center">
                    <ArrowRight className="w-4 h-4 mr-2 text-amber-600" />
                    Host cooking classes
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="w-4 h-4 mr-2 text-amber-600" />
                    Offer private dining experiences
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="w-4 h-4 mr-2 text-amber-600" />
                    Share traditional recipes
                  </li>
                </ul>
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-terracotta-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/host/food");
                  }}
                >
                  Start Hosting Food Experiences
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stay Host */}
          <Card
            className={`cursor-pointer transition-all duration-300 ${
              hoveredCard === 'stay' ? 'shadow-lg scale-105' : ''
            }`}
            onMouseEnter={() => setHoveredCard('stay')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => navigate("/host/stay")}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-sage-100 flex items-center justify-center">
                  <HomeIcon className="w-8 h-8 text-sage-600" />
                </div>
                <h2 className="text-2xl font-semibold">Stay Host</h2>
                <p className="text-muted-foreground">
                  List your space and provide travelers with authentic local accommodation experiences.
                </p>
                <ul className="text-left space-y-2">
                  <li className="flex items-center">
                    <ArrowRight className="w-4 h-4 mr-2 text-sage-600" />
                    List entire homes or rooms
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="w-4 h-4 mr-2 text-sage-600" />
                    Set your own schedule
                  </li>
                  <li className="flex items-center">
                    <ArrowRight className="w-4 h-4 mr-2 text-sage-600" />
                    Earn extra income
                  </li>
                </ul>
                <Button
                  className="w-full bg-gradient-to-r from-sage-500 to-emerald-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/host/stay");
                  }}
                >
                  Start Hosting Stays
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-12">Why Host with Platform 2025?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-terracotta-600 mx-auto flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Earn Extra Income</h3>
              <p className="text-muted-foreground">
                Set your own prices and earn money sharing your passion or space.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-terracotta-600 mx-auto flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Meet New People</h3>
              <p className="text-muted-foreground">
                Connect with travelers from around the world and share your culture.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-terracotta-600 mx-auto flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Secure Platform</h3>
              <p className="text-muted-foreground">
                Benefit from our secure payment system and host protection programs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default BecomeHost;