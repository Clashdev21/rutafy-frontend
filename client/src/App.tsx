import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages
import RoleSelector from "./pages/RoleSelector";
import Login from "./pages/Login";
import RegisterTransportista from "./pages/RegisterTransportista";
import TransportistaPanel from "./pages/TransportistaPanel";
import MensajeroRoute from "./routes/MensajeroRoute";
import NotFound from "./pages/NotFound";

// Legacy Client/Driver pages (keeping for backwards compatibility)
import ClientHome from "./pages/client/ClientHome";
import ClientTracking from "./pages/client/ClientTracking";
import ClientHistory from "./pages/client/ClientHistory";
import ClientProfile from "./pages/client/ClientProfile";
import DriverHome from "./pages/driver/DriverHome";
import DriverService from "./pages/driver/DriverService";
import DriverHistory from "./pages/driver/DriverHistory";
import DriverProfile from "./pages/driver/DriverProfile";

import AdminLogin from "./pages/admin/AdminLogin";
import { adminGuardedRouteEntries } from "./routes/AdminRoutes";

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoleSelector} />
      <Route path="/login" component={Login} />
      <Route path="/register-transportista" component={RegisterTransportista} />

      <Route path="/transportista" component={TransportistaPanel} />
      <Route path="/mensajero" component={MensajeroRoute} />

      <Route path="/client" component={ClientHome} />
      <Route path="/client/tracking" component={ClientTracking} />
      <Route path="/client/history" component={ClientHistory} />
      <Route path="/client/profile" component={ClientProfile} />

      <Route path="/driver" component={DriverHome} />
      <Route path="/driver/service" component={DriverService} />
      <Route path="/driver/history" component={DriverHistory} />
      <Route path="/driver/profile" component={DriverProfile} />

      <Route path="/admin/login" component={AdminLogin} />
      {adminGuardedRouteEntries.map(({ path, component: Component }) => (
        <Route key={path} path={path} component={Component} />
      ))}

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;