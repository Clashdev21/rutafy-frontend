import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ClipboardCheck } from "lucide-react";

const PLANNED_ITEMS = [
  "Sin match conductor / contenedor",
  "Declaraciones duplicadas",
  "Parser con confianza baja",
  "Declaraciones pendientes de revisión humana",
] as const;

export default function AdminPortexManualReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 shrink-0 text-[#2A9D8F]" aria-hidden />
          Revisión manual
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Cola de excepciones documentales y operativas que requieren intervención humana.
        </p>
      </div>

      <Card className="border-dashed border-amber-200 bg-amber-50/40 shadow-sm">
        <CardContent className="py-12 px-6 space-y-4">
          <div className="flex items-center justify-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" aria-hidden />
            <p className="font-medium">Módulo en preparación</p>
          </div>
          <p className="text-sm text-gray-600 text-center max-w-lg mx-auto">
            Esta vista agrupará los casos que no pueden resolverse automáticamente:
          </p>
          <ul className="text-sm text-gray-700 max-w-md mx-auto space-y-2">
            {PLANNED_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5" aria-hidden>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
