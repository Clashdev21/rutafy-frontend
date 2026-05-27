export function buildProtectedEvidenceFilePath(
  serviceId: string,
  evidenceId: string,
): string {
  return `/v1/services/${encodeURIComponent(serviceId)}/evidences/${encodeURIComponent(evidenceId)}/file`;
}
