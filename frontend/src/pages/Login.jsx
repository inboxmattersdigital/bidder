import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Zap, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (role) => {
    const credentials = {
      user: { email: "user@demo.com", password: "demo123" },
      advertiser: { email: "advertiser@demo.com", password: "demo123" },
      admin: { email: "admin@demo.com", password: "demo123" },
      super_admin: { email: "superadmin@demo.com", password: "demo123" },
    };
    
    setLoading(true);
    try {
      await login(credentials[role].email, credentials[role].password);
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#F8FAFC]">OpenRTB</span>
          </div>
          <p className="text-[#64748B]">Sign in to your account</p>
        </div>

        <Card className="surface-primary border-panel">
          <CardHeader>
            <CardTitle className="text-[#F8FAFC]">Welcome back</CardTitle>
            <CardDescription className="text-[#64748B]">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#94A3B8]">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                    required
                    data-testid="login-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#94A3B8]">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                    required
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#2D3B55]">
              <p className="text-sm text-[#64748B] text-center mb-4">Quick login with demo accounts</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loginAsDemo("user")}
                  disabled={loading}
                  className="border-[#2D3B55] text-[#94A3B8] hover:bg-[#1E293B]"
                  data-testid="demo-user"
                >
                  User
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loginAsDemo("advertiser")}
                  disabled={loading}
                  className="border-[#2D3B55] text-[#94A3B8] hover:bg-[#1E293B]"
                  data-testid="demo-advertiser"
                >
                  Advertiser
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loginAsDemo("admin")}
                  disabled={loading}
                  className="border-[#2D3B55] text-[#10B981] hover:bg-[#1E293B]"
                  data-testid="demo-admin"
                >
                  Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loginAsDemo("super_admin")}
                  disabled={loading}
                  className="border-[#2D3B55] text-[#F59E0B] hover:bg-[#1E293B]"
                  data-testid="demo-superadmin"
                >
                  Super Admin
                </Button>
              </div>
            </div>

            <p className="text-sm text-[#64748B] text-center mt-6">
              Don't have an account?{" "}
              <Link to="/register" className="text-[#3B82F6] hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
