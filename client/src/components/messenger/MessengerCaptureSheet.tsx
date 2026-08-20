import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessengerLogisticsTimeline } from "@/components/messenger/MessengerLogisticsTimeline";
import {
  ProtectedEvidenceImage,
  ProtectedEvidenceViewLink,
} from "@/components/ProtectedEvidenceImage";
import type { BackendService } from "@/hooks/useMessengerOperationalState";
import {
  buildAbsoluteUrl,
  formatEvidenceFileSize,
  type ServiceEvidence,
} from "@/hooks/useMessengerOperationalState";
import { resolveMessengerLogisticsTimeline } from "@/lib/messengerUx";
import type { OperationalGeofenceState } from "@/lib/resolveOperationalCopy";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Loader2, Upload, X } from "lucide-react";
import { useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  service: BackendService;
  evidences: ServiceEvidence[];
  geofenceState?: OperationalGeofenceState | null;
  evidenceFile: File | null;
  evidencePreviewUrl: string | null;
  evidenceNote: string;
  setEvidenceNote: (v: string) => void;
  onSelectEvidenceFile: (file: File | null) => void;
  onUploadEvidence: () => void | Promise<void>;
  isUploading: boolean;
  onReportIncident?: () => void;
  isReportingIncident?: boolean;
  className?: string;
};

export function MessengerCaptureSheet({
  open,
  onClose,
  service,
  evidences,
  geofenceState,
  evidenceFile,
  evidencePreviewUrl,
  evidenceNote,
  setEvidenceNote,
  onSelectEvidenceFile,
  onUploadEvidence,
  isUploading,
  onReportIncident,
  isReportingIncident,
  className,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const steps = resolveMessengerLogisticsTimeline(service, evidences, geofenceState);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            aria-label="Cerrar captura"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl",
              className,
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Captura logística"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-[#0F172A]">Captura logística</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-6 space-y-8">
              <MessengerLogisticsTimeline steps={steps} />

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-4">
                <p className="text-sm font-medium text-gray-800">Nueva evidencia</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    onSelectEvidenceFile(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                />

                {evidencePreviewUrl ? (
                  <img
                    src={evidencePreviewUrl}
                    alt="Vista previa"
                    className="max-h-40 w-full rounded-xl border object-cover"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-10 text-gray-400 hover:border-[#2A9D8F]/40 hover:text-[#2A9D8F]"
                  >
                    <Camera className="h-8 w-8" />
                    <span className="text-sm font-medium">Tomar foto</span>
                  </button>
                )}

                {evidenceFile ? (
                  <p className="text-xs text-gray-500">
                    {evidenceFile.name} · {formatEvidenceFileSize(evidenceFile.size)}
                  </p>
                ) : null}

                <div>
                  <Label htmlFor="capture-note" className="text-xs text-gray-500">
                    Nota opcional
                  </Label>
                  <Input
                    id="capture-note"
                    placeholder="Ej. documento en ventanilla"
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button
                  type="button"
                  disabled={!evidenceFile || isUploading}
                  onClick={() => void onUploadEvidence()}
                  className="w-full bg-[#2A9D8F] hover:bg-[#238b7e]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" aria-hidden />
                      Subir evidencia
                    </>
                  )}
                </Button>
              </div>

              {evidences.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Registradas
                  </p>
                  {evidences.map((evidence) => {
                    const evidenceId = String(evidence.evidence_id ?? "").trim();
                    const serviceId = service.service_id;
                    const useProtected = Boolean(evidenceId && serviceId);
                    const legacyUrl = !useProtected ? buildAbsoluteUrl(evidence.file_url) : null;
                    return (
                      <div
                        key={evidence.evidence_id}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 p-2"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {useProtected ? (
                            <ProtectedEvidenceImage
                              serviceId={serviceId}
                              evidenceId={evidenceId}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : legacyUrl ? (
                            <img src={legacyUrl} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 text-xs text-gray-600">
                          <p className="font-medium text-gray-800">{evidence.kind}</p>
                          {evidence.note ? <p className="truncate">{evidence.note}</p> : null}
                        </div>
                        {useProtected ? (
                          <ProtectedEvidenceViewLink
                            serviceId={serviceId}
                            evidenceId={evidenceId}
                            label="Ver"
                            className="text-xs text-[#2A9D8F] no-underline"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {onReportIncident ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isReportingIncident}
                  onClick={() => void onReportIncident()}
                  className="w-full text-gray-600"
                >
                  {isReportingIncident ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Reportando...
                    </>
                  ) : (
                    "Reportar incidente"
                  )}
                </Button>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
