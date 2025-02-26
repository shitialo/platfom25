import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const Login = () => {
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md px-8 py-12 bg-white rounded-lg shadow-sm">
          <h1 className="text-4xl font-bold mb-8 text-center">Welcome Back</h1>
          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="Enter your email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="Enter your password" />
            </div>
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              Log in
            </Button>
          </form>
          <div className="mt-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;
