import { Button } from "@/components/ui/button";
import {
  MessengerBottomNav,
  type MessengerTab,
} from "@/components/messenger/MessengerBottomNav";
import { MessengerCaptureSheet } from "@/components/messenger/MessengerCaptureSheet";
import { MessengerActiveServiceScreen } from "@/components/messenger/MessengerActiveServiceScreen";
import { MessengerHistoryScreen } from "@/components/messenger/MessengerHistoryScreen";
import { MessengerHomeIdle } from "@/components/messenger/MessengerHomeIdle";
import { MessengerOfferScreen } from "@/components/messenger/MessengerOfferScreen";
import {
  useMessengerOperationalState,
} from "@/hooks/useMessengerOperationalState";
import {
  resolveMessengerZoneLabel,
} from "@/lib/messengerUx";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export { isValidUuid } from "@/hooks/useMessengerOperationalState";

type MessengerMapPosition = { lat: number; lng: number };

function resolveMessengerMapPosition(
  locationStatus: string,
  currentLat: number | null,
  currentLng: number | null,
): MessengerMapPosition | null {
  if (locationStatus !== "fresh") return null;
  if (currentLat == null || currentLng == null) return null;
  if (!Number.isFinite(currentLat) || !Number.isFinite(currentLng)) return null;
  return { lat: currentLat, lng: currentLng };
}

function OfflineView(props: { onToggle: () => void }) {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-8 gap-6">
      <p className="text-2xl font-bold text-white">Desconectado</p>
      <p className="text-sm text-white/60 text-center max-w-xs">
        Actívate para recibir servicios cerca de ti
      </p>
      <Button
        type="button"
        onClick={() => props.onToggle()}
        className="w-full max-w-xs h-14 rounded-2xl bg-[#2A9D8F] hover:bg-[#238b7e] text-base font-semibold"
      >
        Ponerte en línea
      </Button>
    </div>
  );
}

export default function MensajeroPanel() {
  const op = useMessengerOperationalState();
  const [messengerTab, setMessengerTab] = useState<MessengerTab>("home");
  const [captureOpen, setCaptureOpen] = useState(false);

  const {
    closePin,
    setClosePin,
    validationError,
    completedServices,
    terminalOtherServices,
    myServices,
    claimingServiceId,
    startingServiceId,
    closingServiceId,
    reportingIncidentServiceId,
    currentLat,
    currentLng,
    locationStatus,
    locationPermissionState,
    dispatchCurrentService,
    activeGeofenceState,
    firstOffer,
    uiState,
    loading,
    evidencesByService,
    uploadingEvidenceServiceId,
    evidenceFile,
    evidencePreviewUrl,
    evidenceNote,
    setEvidenceNote,
    handleToggleAvailability,
    handleLogout,
    handleAcceptService,
    handleOmitCurrentOffer,
    handleStartService,
    handleReportIncident,
    requestLocationPermission,
    handleSelectEvidenceFile,
    uploadEvidenceForService,
    loadEvidencesForService,
    handleCloseService,
    setSelectedService,
  } = op;

  const messengerMapPosition = resolveMessengerMapPosition(
    locationStatus,
    currentLat,
    currentLng,
  );
  const locationFresh = locationStatus === "fresh";
  const zoneLabel = resolveMessengerZoneLabel(myServices);

  useEffect(() => {
    if (uiState === "IN_SERVICE" || uiState === "ASSIGNED") {
      setCaptureOpen(false);
    }
  }, [uiState, dispatchCurrentService?.service_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" aria-hidden />
          <p className="text-sm">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (uiState === "OFFLINE") {
    return <OfflineView onToggle={() => void handleToggleAvailability()} />;
  }

  if (messengerTab === "history" && uiState === "AVAILABLE") {
    return (
      <MessengerHistoryScreen
        completedServices={completedServices}
        terminalServices={terminalOtherServices}
        onBack={() => setMessengerTab("home")}
      />
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {uiState === "AVAILABLE" ? (
          <motion.div
            key="available"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative min-h-screen"
          >
            <MessengerHomeIdle
              zoneLabel={zoneLabel}
              locationStatus={locationStatus}
              locationPermissionState={locationPermissionState}
              onRequestLocationPermission={() => void requestLocationPermission()}
              onToggleOffline={() => void handleToggleAvailability()}
              onLogout={() => void handleLogout()}
            />

            <MessengerBottomNav active={messengerTab} onChange={setMessengerTab} />
          </motion.div>
        ) : null}

        {uiState === "OFFER" && firstOffer ? (
          <MessengerOfferScreen
            key={`offer-${firstOffer.service_id}`}
            offer={firstOffer}
            messengerLat={currentLat}
            messengerLng={currentLng}
            locationFresh={locationFresh}
            onAccept={() => handleAcceptService(firstOffer.service_id, firstOffer)}
            isAccepting={claimingServiceId === firstOffer.service_id}
            onOmit={handleOmitCurrentOffer}
          />
        ) : null}

        {uiState === "ASSIGNED" && dispatchCurrentService ? (
          <MessengerActiveServiceScreen
            key={`assigned-${dispatchCurrentService.service_id}`}
            service={dispatchCurrentService}
            mode="assigned"
            messengerPosition={messengerMapPosition}
            currentLat={currentLat}
            currentLng={currentLng}
            locationFresh={locationFresh}
            geofenceState={activeGeofenceState}
            onStart={() => handleStartService(dispatchCurrentService)}
            isStarting={startingServiceId === dispatchCurrentService.service_id}
          />
        ) : null}

        {uiState === "IN_SERVICE" && dispatchCurrentService ? (
          <MessengerActiveServiceScreen
            key={`in-service-${dispatchCurrentService.service_id}`}
            service={dispatchCurrentService}
            mode="in_service"
            messengerPosition={messengerMapPosition}
            currentLat={currentLat}
            currentLng={currentLng}
            locationFresh={locationFresh}
            geofenceState={activeGeofenceState}
            onOpenCapture={() => {
              setSelectedService(dispatchCurrentService);
              void loadEvidencesForService(dispatchCurrentService);
              setCaptureOpen(true);
            }}
            closePin={closePin}
            setClosePin={setClosePin}
            onCloseService={handleCloseService}
            closingServiceId={closingServiceId}
            validationError={validationError}
            evidences={evidencesByService[dispatchCurrentService.service_id] ?? []}
          />
        ) : null}
      </AnimatePresence>

      {dispatchCurrentService && uiState === "IN_SERVICE" ? (
        <MessengerCaptureSheet
          open={captureOpen}
          onClose={() => setCaptureOpen(false)}
          service={dispatchCurrentService}
          evidences={evidencesByService[dispatchCurrentService.service_id] ?? []}
          geofenceState={activeGeofenceState}
          evidenceFile={evidenceFile}
          evidencePreviewUrl={evidencePreviewUrl}
          evidenceNote={evidenceNote}
          setEvidenceNote={setEvidenceNote}
          onSelectEvidenceFile={handleSelectEvidenceFile}
          onUploadEvidence={() => void uploadEvidenceForService(dispatchCurrentService)}
          isUploading={uploadingEvidenceServiceId === dispatchCurrentService.service_id}
          onReportIncident={() => void handleReportIncident(dispatchCurrentService)}
          isReportingIncident={
            reportingIncidentServiceId === dispatchCurrentService.service_id
          }
        />
      ) : null}
    </>
  );
}
