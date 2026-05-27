import { useEffect, useState } from "react";
import { http } from "@/api/http";
import { buildProtectedEvidenceFilePath } from "@/lib/serviceEvidenceFile";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ProtectedEvidenceImageProps = {
  serviceId: string;
  evidenceId: string;
  alt?: string;
  className?: string;
  /** Envuelve la imagen en enlace al blob cuando está listo. */
  linked?: boolean;
  linkClassName?: string;
  onLoadedUrl?: (url: string | null) => void;
};

export function ProtectedEvidenceImage({
  serviceId,
  evidenceId,
  alt = "",
  className,
  linked = false,
  linkClassName,
  onLoadedUrl,
}: ProtectedEvidenceImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setStatus("loading");
    setBlobUrl(null);
    onLoadedUrl?.(null);

    const path = buildProtectedEvidenceFilePath(serviceId, evidenceId);
    http
      .get(path, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
        setStatus("ready");
        onLoadedUrl?.(objectUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        onLoadedUrl?.(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      onLoadedUrl?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onLoadedUrl opcional estable por padre
  }, [serviceId, evidenceId]);

  if (status === "loading") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center text-xs text-slate-500",
          className,
        )}
        aria-busy="true"
      >
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
      </span>
    );
  }

  if (status === "error" || !blobUrl) {
    return (
      <span className={cn("text-xs text-slate-500", className)}>
        No se pudo cargar evidencia
      </span>
    );
  }

  const img = <img src={blobUrl} alt={alt} className={className} />;

  if (linked) {
    return (
      <a
        href={blobUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        {img}
      </a>
    );
  }

  return img;
}

type ProtectedEvidenceViewLinkProps = {
  serviceId: string;
  evidenceId: string;
  label?: string;
  className?: string;
};

/** Abre el archivo protegido en una pestaña nueva (blob + JWT vía http). */
export function ProtectedEvidenceViewLink({
  serviceId,
  evidenceId,
  label = "Ver archivo",
  className,
}: ProtectedEvidenceViewLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    setError(false);
    let objectUrl: string | null = null;
    try {
      const path = buildProtectedEvidenceFilePath(serviceId, evidenceId);
      const res = await http.get(path, { responseType: "blob" });
      objectUrl = URL.createObjectURL(res.data);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }, 60_000);
    } catch {
      setError(true);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <span className="text-xs text-slate-500">No se pudo cargar evidencia</span>;
  }

  return (
    <button
      type="button"
      onClick={() => void handleOpen()}
      disabled={loading}
      className={cn(
        "inline-flex text-[#2A9D8F] font-medium hover:underline disabled:opacity-60",
        className,
      )}
    >
      {loading ? "Abriendo…" : label}
    </button>
  );
}
