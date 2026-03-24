import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, Truck, Users, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { data: companies = [] } = trpc.admin.companies.list.useQuery();
  const { data: users = [] } = trpc.admin.users.list.useQuery();
  const { data: services = [] } = trpc.admin.services.list.useQuery();

  const activeCompanies = companies.filter(c => c.active).length;
  const activeMensajeros = users.filter(u => u.appRole === 'MENSAJERO' && u.active).length;
  const activeTransportistas = users.filter(u => u.appRole === 'TRANSPORTISTA' && u.active).length;
  const completedServices = services.filter(s => s.status === 'COMPLETED' || s.status === 'FULFILLED').length;
  const pendingServices = services.filter(s => s.status === 'CREATED' || s.status === 'IN_PROGRESS').length;

  const stats = [
    {
      title: "Empresas Activas",
      value: activeCompanies,
      total: companies.length,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Mensajeros",
      value: activeMensajeros,
      total: users.filter(u => u.appRole === 'MENSAJERO').length,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Transportistas",
      value: activeTransportistas,
      total: users.filter(u => u.appRole === 'TRANSPORTISTA').length,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Servicios Completados",
      value: completedServices,
      total: services.length,
      icon: Truck,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1E3A5F]">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen general del sistema</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-[#1E3A5F] mt-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      de {stat.total} total
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Services */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Servicios Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No hay servicios registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {services.slice(0, 5).map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1E3A5F] truncate">
                          {service.origin} → {service.destination}
                        </p>
                        <p className="text-xs text-gray-400">
                          {service.serviceType}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          service.status === 'COMPLETED' || service.status === 'FULFILLED'
                            ? 'bg-green-100 text-green-700'
                            : service.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {service.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-[#1E3A5F] flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Estado del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Servicios Pendientes</span>
                  <span className="text-lg font-bold text-[#1E3A5F]">{pendingServices}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Mensajeros Activos</span>
                  <span className="text-lg font-bold text-[#1E3A5F]">{activeMensajeros}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Empresas Registradas</span>
                  <span className="text-lg font-bold text-[#1E3A5F]">{companies.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Total Usuarios</span>
                  <span className="text-lg font-bold text-[#1E3A5F]">{users.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
