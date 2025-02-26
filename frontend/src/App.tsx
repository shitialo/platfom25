import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Index from "@/pages/Index";
import Food from "@/pages/Food";
import FoodDetails from "@/pages/FoodDetails";
import Stays from "@/pages/Stays";
import StayDetail from "@/pages/StayDetail";
import BecomeHost from "@/pages/BecomeHost";
import HostFood from "@/pages/host/HostFood";
import HostStay from "@/pages/host/HostStay";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Help from "@/pages/Help";
import Safety from "@/pages/Safety";
import HostDashboard from "@/pages/host/HostDashboard";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect } from "react";
import StayDetails from "@/pages/StayDetails";
import Profile from "@/pages/Profile";

const HostRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !user.is_host)) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return user && user.is_host ? <>{children}</> : null;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/food" element={<Food />} />
          <Route path="/foods/:id" element={<FoodDetails />} />
          <Route path="/food/:id" element={<FoodDetails />} />
          <Route path="/stays" element={<Stays />} />
          <Route path="/stays/:id" element={<StayDetails />} />
          <Route path="/become-host" element={<BecomeHost />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/help" element={<Help />} />
          <Route path="/safety" element={<Safety />} />
          <Route
            path="/host/dashboard"
            element={
              <ProtectedRoute>
                <HostRoute>
                  <HostDashboard />
                </HostRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/food"
            element={
              <ProtectedRoute>
                <HostFood />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/food/:id"
            element={
              <ProtectedRoute>
                <HostFood />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/stay"
            element={
              <ProtectedRoute>
                <HostStay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/stay/:id"
            element={
              <ProtectedRoute>
                <HostStay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;