import { Card, CardContent } from "@/components/ui/card";
import { FileText, Inbox } from "lucide-react";

export default function AdminPortexDeclarationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <Inbox className="h-6 w-6 shrink-0 text-[#2A9D8F]" aria-hidden />
          Declaraciones
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Correos, importaciones y declaraciones documentales de contenedores Portex.
        </p>
      </div>

      <Card className="border-dashed border-gray-200 shadow-sm">
        <CardContent className="py-16 px-6 text-center space-y-3">
          <FileText className="h-10 w-10 mx-auto text-gray-300" aria-hidden />
          <p className="text-base font-medium text-[#1E3A5F]">
            Módulo documental de contenedores en construcción
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Aquí vivirá el flujo de correos recibidos, parser, matching y declaraciones Mabe.
            No forma parte de la Torre de Control operativa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
