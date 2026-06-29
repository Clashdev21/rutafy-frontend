import type { AdminMessenger } from "@/api/admin-messengers";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type Props = {
  open: boolean;
  messenger: AdminMessenger | null;
  onOpenChange: (open: boolean) => void;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-500 uppercase">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

export function OperationalTransporterDrawer({ open, messenger, onOpenChange }: Props) {
  if (!messenger) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-lg" />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[#1E3A5F]">{messenger.full_name}</SheetTitle>
          <p className="text-sm text-gray-500">{messenger.phone}</p>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {[
              ["info", "Información"],
              ["vehicle", "Vehículo"],
              ["programs", "Programas"],
              ["captures", "Capturas"],
              ["history", "Historial"],
              ["gps", "GPS"],
              ["alerts", "Alertas"],
              ["containers", "Contenedores"],
            ].map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="text-xs">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="info" className="space-y-3 mt-4">
            <Field label="Conductor" value={messenger.full_name} />
            <Field label="Teléfono" value={messenger.phone} />
            <Field
              label="Documento"
              value={[messenger.doc_type, messenger.doc_number].filter(Boolean).join(" ") || "—"}
            />
            <Field label="Estado" value={messenger.availability_status?.trim() || "—"} />
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-3 mt-4">
            <Field label="Placa" value={messenger.plate?.trim() || "—"} />
            <Field label="Tipo vehículo" value={messenger.vehicle_type?.trim() || "—"} />
          </TabsContent>

          <TabsContent value="programs" className="mt-4">
            <Field label="Nodo / programa actual" value={messenger.current_node_name?.trim() || "—"} />
            <p className="text-xs text-gray-400 mt-4">Asignación detallada próximamente.</p>
          </TabsContent>

          <TabsContent value="captures" className="mt-4">
            <p className="text-sm text-gray-500">Capturas y evidencias — próximamente.</p>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <p className="text-sm text-gray-500">Historial de contenedores atendidos — próximamente.</p>
          </TabsContent>

          <TabsContent value="gps" className="mt-4 space-y-2">
            <Badge variant="outline">GPS no disponible en listado actual</Badge>
            <p className="text-xs text-gray-500">Calidad GPS desde módulo Trazabilidad.</p>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <p className="text-sm text-gray-500">Sin alertas activas.</p>
          </TabsContent>

          <TabsContent value="containers" className="mt-4">
            <p className="text-sm text-gray-500">Contenedores atendidos — próximamente.</p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
