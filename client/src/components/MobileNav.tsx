import { useLocation } from "wouter";
import { Home, Clock, User, LayoutDashboard, Users, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface MobileNavProps {
  type: "client" | "driver" | "admin";
}

const navItems: Record<string, NavItem[]> = {
  client: [
    { icon: Home, label: "Inicio", path: "/client" },
    { icon: Clock, label: "Historial", path: "/client/history" },
    { icon: User, label: "Perfil", path: "/client/profile" },
  ],
  driver: [
    { icon: Home, label: "Inicio", path: "/driver" },
    { icon: Clock, label: "Historial", path: "/driver/history" },
    { icon: User, label: "Perfil", path: "/driver/profile" },
  ],
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Users, label: "Conductores", path: "/admin/drivers" },
    { icon: FileText, label: "Servicios", path: "/admin/services" },
  ],
};

export default function MobileNav({ type }: MobileNavProps) {
  const [location, setLocation] = useLocation();
  const items = navItems[type];

  return (
    <nav className="tab-bar">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors min-w-[72px]",
                isActive
                  ? "text-[#2A9D8F]"
                  : "text-gray-400 active:bg-gray-100"
              )}
            >
              <item.icon
                className={cn(
                  "w-6 h-6 transition-transform",
                  isActive && "scale-110"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn("text-xs", isActive && "font-medium")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
