import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Home, Utensils, Hotel, Plus, ArrowRight, 
  DollarSign, Users, Calendar, Star 
} from "lucide-react";

interface Experience {
  id: number;
  title: string;
  status: string;
  price_per_person: number;
  created_at: string;
  total_bookings?: number;
}

interface Stay {
  id: number;
  title: string;
  status: string;
  price_per_night: number;
  created_at: string;
  total_bookings?: number;
}

const HostDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [foodExperiences, setFoodExperiences] = useState<Experience[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const [foodRes, staysRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/host/food-experiences`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_API_URL}/host/stays`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!foodRes.ok || !staysRes.ok) {
          throw new Error('Failed to fetch listings');
        }

        const [foodData, staysData] = await Promise.all([
          foodRes.json(),
          staysRes.json()
        ]);

        setFoodExperiences(foodData || []);
        setStays(staysData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setFoodExperiences([]);
        setStays([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'text-green-600 bg-green-100';
      case 'draft':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-terracotta-50 p-6">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Host Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}!</p>
          </div>
          <div className="space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Button>
            <Button 
              onClick={() => navigate('/host/food')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Experience
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">$1,234</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Guests</p>
                <p className="text-2xl font-bold">42</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Listings</p>
                <p className="text-2xl font-bold">
                  {foodExperiences.length + stays.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg. Rating</p>
                <p className="text-2xl font-bold">4.8</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Food Experiences Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5" />
                Food Experiences
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/host/food')}
                className="flex items-center gap-2"
              >
                Add New <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {foodExperiences.map((exp) => (
                <div 
                  key={exp.id}
                  className="py-4 flex items-center justify-between hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate(`/host/food/${exp.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{exp.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>${exp.price_per_person} per person</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exp.status)}`}>
                        {exp.status}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
              {foodExperiences.length === 0 && (
                <p className="py-4 text-center text-gray-500">
                  No food experiences yet. Create your first one!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stays Section */}
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Hotel className="w-5 h-5" />
                Stays
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/host/stay')}
                className="flex items-center gap-2"
              >
                Add New <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {stays.map((stay) => (
                <div 
                  key={stay.id}
                  className="py-4 flex items-center justify-between hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate(`/host/stay/${stay.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{stay.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>${stay.price_per_night} per night</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(stay.status)}`}>
                        {stay.status}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
              {stays.length === 0 && (
                <p className="py-4 text-center text-gray-500">
                  No stays yet. Create your first one!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HostDashboard; 