import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Building2,
  Home,
  LogOut,
  MapPin,
  PanelLeft,
  TriangleAlert,
  Truck,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: Home, label: "Dashboard", path: "/admin" },
  { icon: Building2, label: "Empresas", path: "/admin/companies" },
  { icon: Users, label: "Usuarios", path: "/admin/users" },
  { icon: Truck, label: "Servicios", path: "/admin/services" },
  { icon: MapPin, label: "Nodos", path: "/admin/nodes" },
  { icon: TriangleAlert, label: "Alertas", path: "/admin/alerts" },
];

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

type EffectiveAdminUser = {
  name?: string | null;
  email?: string | null;
  role?: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  const { loading, user, logout } = useAuth();

  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const devAdminUser: EffectiveAdminUser = useMemo(
    () => ({
      name: "Admin Local",
      email: "admin.local@rutafy.dev",
      role: "admin",
    }),
    []
  );

  const effectiveUser: EffectiveAdminUser | null = user || (isLocalDev ? devAdminUser : null);
  const isAdmin = effectiveUser?.role === "admin";

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading && !isLocalDev) {
    return <DashboardLayoutSkeleton />;
  }

  if (!effectiveUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1E3A5F]">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-2xl shadow-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1E3A5F] flex items-center justify-center">
              <span className="text-2xl font-bold text-[#36f532]">R</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">
              Rutafy Admin
            </h1>
            <p className="text-sm text-gray-500 text-center">
              Inicia sesión para acceder al panel de administración
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full bg-[#36f532] hover:bg-[#2dd429] text-[#1E3A5F] font-semibold"
          >
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1E3A5F]">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-2xl shadow-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
              <span className="text-2xl">🚫</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1E3A5F]">
              Acceso Denegado
            </h1>
            <p className="text-sm text-gray-500 text-center">
              No tienes permisos de administrador para acceder a esta sección.
            </p>
          </div>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="w-full"
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <AdminLayoutContent
        setSidebarWidth={setSidebarWidth}
        user={effectiveUser}
        logoutAction={async () => {
          if (isLocalDev && !user) {
            window.location.href = "/";
            return;
          }
          await logout();
        }}
      >
        {children}
      </AdminLayoutContent>
    </SidebarProvider>
  );
}

type AdminLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  user: EffectiveAdminUser;
  logoutAction: () => Promise<void> | void;
};

function AdminLayoutContent({
  children,
  setSidebarWidth,
  user,
  logoutAction,
}: AdminLayoutContentProps) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-[#1E3A5F]"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center bg-[#1E3A5F]">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-white/70" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[#36f532] text-lg tracking-tight truncate">
                    Rutafy
                  </span>
                  <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded">
                    Admin
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 bg-[#1E3A5F]">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal text-white/80 hover:text-white hover:bg-white/10 ${
                        isActive ? "bg-[#36f532]/20 text-[#36f532]" : ""
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-[#36f532]" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 bg-[#1E3A5F]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-white/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-9 w-9 border border-white/20 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-[#36f532] text-[#1E3A5F]">
                      {user?.name?.charAt(0).toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-white">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-white/50 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/")}
                  className="cursor-pointer"
                >
                  <Home className="mr-2 h-4 w-4" />
                  <span>Ir a la App</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logoutAction()}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#36f532]/30 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-gray-50">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-[#1E3A5F] px-2 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-white/10 text-white" />
              <div className="flex items-center gap-3">
                <span className="tracking-tight text-white font-medium">
                  {activeMenuItem?.label ?? "Admin"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}