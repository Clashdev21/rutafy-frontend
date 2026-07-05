import {
  cancelAdminTrackingSession,
  endAdminTrackingSession,
  type AdminTrackingSessionCloseResult,
} from "@/api/tracking-sessions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { isTrackingSessionActive } from "@/lib/trackingSessionConstants";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PendingAction = "end" | "cancel" | null;

type Props = {
  sessionId: string;
  status?: string | null;
  disabled?: boolean;
  size?: "sm" | "default";
  onCompleted?: (result: AdminTrackingSessionCloseResult) => void;
};

export function TrackingSessionCloseActions({
  sessionId,
  status,
  disabled,
  size = "default",
  onCompleted,
}: Props) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isTrackingSessionActive(status)) {
    return null;
  }

  const runAction = async (action: "end" | "cancel") => {
    setSubmitting(true);
    try {
      const result =
        action === "end"
          ? await endAdminTrackingSession(sessionId)
          : await cancelAdminTrackingSession(sessionId);
      toast.success(
        action === "end" ? "Captura finalizada correctamente" : "Captura cancelada",
      );
      onCompleted?.(result);
      setPending(null);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo completar la acción";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const btnClass = size === "sm" ? "h-8 text-xs" : "";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size={size === "sm" ? "sm" : "default"}
          className={`bg-[#2A9D8F] hover:bg-[#238b7e] ${btnClass}`}
          disabled={disabled || submitting}
          onClick={() => setPending("end")}
        >
          Finalizar
        </Button>
        <Button
          type="button"
          variant="outline"
          size={size === "sm" ? "sm" : "default"}
          className={`text-red-700 border-red-200 hover:bg-red-50 ${btnClass}`}
          disabled={disabled || submitting}
          onClick={() => setPending("cancel")}
        >
          Cancelar
        </Button>
      </div>

      <AlertDialog
        open={pending === "end"}
        onOpenChange={(open) => {
          if (!open && !submitting) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar captura</AlertDialogTitle>
            <AlertDialogDescription>
              La sesión pasará a estado <strong>Finalizada</strong> y dejará de aceptar
              nuevos puntos GPS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-[#2A9D8F] hover:bg-[#238b7e]"
              onClick={(e) => {
                e.preventDefault();
                void runAction("end");
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Finalizando…
                </>
              ) : (
                "Confirmar finalización"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pending === "cancel"}
        onOpenChange={(open) => {
          if (!open && !submitting) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar captura</AlertDialogTitle>
            <AlertDialogDescription>
              La sesión pasará a estado <strong>Cancelada</strong>. Esta acción no se puede
              deshacer y no se registrarán más puntos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void runAction("cancel");
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Cancelando…
                </>
              ) : (
                "Confirmar cancelación"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
