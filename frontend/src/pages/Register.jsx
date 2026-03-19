import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Zap, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name, role);
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
          <p className="text-[#64748B]">Create your account</p>
        </div>

        <Card className="surface-primary border-panel">
          <CardHeader>
            <CardTitle className="text-[#F8FAFC]">Get started</CardTitle>
            <CardDescription className="text-[#64748B]">
              Create an account to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#94A3B8]">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                    required
                    data-testid="register-name"
                  />
                </div>
              </div>

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
                    data-testid="register-email"
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
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 surface-secondary border-[#2D3B55] text-[#F8FAFC]"
                    required
                    minLength={6}
                    data-testid="register-password"
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

              <div className="space-y-2">
                <Label htmlFor="role" className="text-[#94A3B8]">Account Type</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="surface-secondary border-[#2D3B55] text-[#F8FAFC]" data-testid="register-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="surface-primary border-[#2D3B55]">
                    <SelectItem value="user" className="text-[#F8FAFC]">User - Basic access</SelectItem>
                    <SelectItem value="advertiser" className="text-[#F8FAFC]">Advertiser - Campaign management</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#64748B]">
                  Admin accounts must be created by an administrator
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90"
                disabled={loading}
                data-testid="register-submit"
              >
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <p className="text-sm text-[#64748B] text-center mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-[#3B82F6] hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
