import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const Navigation = () => {
  const { user, logout } = useAuth();
  
  console.log('Navigation rendering with user:', user); // Debug log

  // Force re-render when user changes
  useEffect(() => {
    console.log('User changed in Navigation:', user);
  }, [user]);

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">
            NativeBites
          </Link>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {console.log('Rendering nav buttons, is_host:', user.is_host)}
                {user.is_host ? (
                  <Link to="/host/dashboard">
                    <Button variant="outline">Host Dashboard</Button>
                  </Link>
                ) : (
                  <Link to="/become-host">
                    <Button variant="outline">Become a Host</Button>
                  </Link>
                )}
                <Button variant="ghost" onClick={logout}>
                  Logout
                </Button>
                <span className="text-sm font-medium">
                  {user.name}
                </span>
              </>
            ) : (
              <Link to="/login">
                <Button>Login</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 