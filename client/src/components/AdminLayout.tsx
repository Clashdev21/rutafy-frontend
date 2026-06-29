import type { AdminUser } from "@/api/adminAuth";
import { adminLogout } from "@/api/adminAuth";
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
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BellRing,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  MapPinned,
  Package,
  PanelLeft,
  Radio,
  Satellite,
  Truck,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type AdminMenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

type AdminMenuSection = {
  title: string;
  items: AdminMenuItem[];
};

const menuSections: AdminMenuSection[] = [
  {
    title: "RUTAFY MENSAJERÍA",
    items: [
      { icon: Radio, label: "Centro de Mensajería", path: "/admin/ops/map" },
      { icon: Package, label: "Mensajeros", path: "/admin/mensajeros" },
      { icon: ClipboardList, label: "Servicios", path: "/admin/services" },
      { icon: MapPinned, label: "Trazabilidad", path: "/admin/tracking" },
      { icon: Satellite, label: "Calidad GPS", path: "/admin/tracking-alerts" },
    ],
  },
  {
    title: "PORTEX CONTENEDORES",
    items: [
      { icon: LayoutDashboard, label: "Torre de Control", path: "/admin/operational-control" },
      { icon: Truck, label: "Transportistas", path: "/admin/companies" },
      { icon: Inbox, label: "Declaraciones", path: "/admin/declarations" },
      { icon: ClipboardCheck, label: "Revisión manual", path: "/admin/manual-review" },
      { icon: BellRing, label: "Alertas", path: "/admin/alerts" },
    ],
  },
  {
    title: "ADMINISTRACIÓN",
    items: [
      { icon: BarChart3, label: "Indicadores", path: "/admin/dashboard" },
      { icon: MapPin, label: "Nodos logísticos", path: "/admin/nodes" },
      { icon: Users, label: "Usuarios", path: "/admin/users" },
      { icon: Building2, label: "Clientes / Empresas", path: "/admin/clients" },
      { icon: Bell, label: "Notificaciones", path: "/admin/notifications" },
    ],
  },
];

const flatMenuItems = menuSections.flatMap((section) => section.items);

function isMenuItemActive(path: string, location: string): boolean {
  if (location === path) return true;
  if (
    path === "/admin/operational-control" &&
    (location === "/admin" || location === "/admin/operational-control")
  ) {
    return true;
  }
  if (
    path === "/admin/ops/map" &&
    (location === "/admin/ops/map" || location === "/admin/live-operations")
  ) {
    return true;
  }
  if (path === "/admin/tracking" && location.startsWith("/admin/tracking")) {
    return true;
  }
  return false;
}

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

type AdminLayoutProps = {
  children: React.ReactNode;
  user: AdminUser;
};

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  const handleAdminLogout = async () => {
    await adminLogout();
    setLocation("/admin/login", { replace: true });
  };

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
        user={user}
        onLogout={handleAdminLogout}
      >
        {children}
      </AdminLayoutContent>
    </SidebarProvider>
  );
}

type AdminLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  user: AdminUser;
  onLogout: () => Promise<void>;
};

function AdminLayoutContent({
  children,
  setSidebarWidth,
  user,
  onLogout,
}: AdminLayoutContentProps) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeMenuItem = useMemo(
    () => flatMenuItems.find((item) => isMenuItemActive(item.path, location)),
    [location],
  );

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
            <div className="flex w-full items-center gap-3 px-2 transition-all">
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10 focus:outline-none"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-white/70" />
              </button>
              {!isCollapsed ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-lg font-bold tracking-tight text-[#36f532]">
                    Rutafy
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/50">
                    Admin
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-2 bg-[#1E3A5F]">
            {menuSections.map((section) => (
              <SidebarGroup key={section.title} className="px-2 py-0">
                <SidebarGroupLabel className="px-2 text-[10px] font-semibold tracking-wider text-white/40 uppercase group-data-[collapsible=icon]:hidden">
                  {section.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="py-0">
                    {section.items.map((item) => {
                      const isActive = isMenuItemActive(item.path, location);
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={item.label}
                            className={`h-10 font-normal text-white/80 transition-all hover:bg-white/10 hover:text-white ${
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
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="bg-[#1E3A5F] p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="group-data-[collapsible=icon]:justify-center flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/10 focus:outline-none">
                  <Avatar className="h-9 w-9 shrink-0 border border-white/20">
                    <AvatarFallback className="bg-[#36f532] text-xs font-medium text-[#1E3A5F]">
                      {user.name?.charAt(0).toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium leading-none text-white">
                      {user.name || "Administrador"}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-white/50">
                      {user.email || user.phone || "—"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => setLocation("/")}
                  className="cursor-pointer"
                >
                  <Home className="mr-2 h-4 w-4" />
                  <span>Ir a la App</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => void onLogout()}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión admin</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors hover:bg-[#36f532]/30 ${
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
        {isMobile ? (
          <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-[#1E3A5F] px-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-white/10 text-white" />
              <span className="font-medium tracking-tight text-white">
                {activeMenuItem?.label ?? "Admin"}
              </span>
            </div>
          </div>
        ) : null}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
