import { useAuth } from "../context/AuthContext";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

export function AccessDenied({ 
  title = "Access Not Allocated",
  message = "You don't have permission to access this section. Please contact your administrator if you believe this is an error.",
  showBackButton = true,
  showHomeButton = true
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6" data-testid="access-denied">
      <Card className="surface-primary border-panel max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-[#EF4444]" />
          </div>
          
          <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">{title}</h2>
          <p className="text-sm text-[#64748B] mb-6">{message}</p>
          
          {user && (
            <div className="p-3 rounded-lg bg-[#0B1221] border border-[#2D3B55] mb-6">
              <p className="text-xs text-[#64748B]">Current Role</p>
              <p className="text-sm text-[#F8FAFC] font-medium capitalize">
                {user.role?.replace("_", " ")}
              </p>
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            {showBackButton && (
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-[#2D3B55] text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
            {showHomeButton && (
              <Button
                onClick={() => navigate("/dashboard")}
                className="bg-[#3B82F6] hover:bg-[#60A5FA]"
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Higher-order component for route protection
export function ProtectedRoute({ 
  children, 
  requiredSidebarAccess,
  requiredRole,
  requiredPermission
}) {
  const { user, hasSidebarAccess, hasRole, hasPermission } = useAuth();

  // Check sidebar access
  if (requiredSidebarAccess && !hasSidebarAccess(requiredSidebarAccess)) {
    return (
      <AccessDenied 
        title="Access Not Allocated"
        message={`You don't have access to this section. This feature requires "${requiredSidebarAccess.replace("_", " ")}" access.`}
      />
    );
  }

  // Check role
  if (requiredRole && !hasRole(requiredRole)) {
    const roleNames = Array.isArray(requiredRole) 
      ? requiredRole.map(r => r.replace("_", " ")).join(" or ")
      : requiredRole.replace("_", " ");
    return (
      <AccessDenied 
        title="Access Not Allocated"
        message={`This section is restricted to ${roleNames} users only.`}
      />
    );
  }

  // Check permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <AccessDenied 
        title="Permission Denied"
        message={`You don't have the required permission: "${requiredPermission.replace("_", " ")}".`}
      />
    );
  }

  return children;
}

export default AccessDenied;
