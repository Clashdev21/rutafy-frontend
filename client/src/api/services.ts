import { http } from "./http";

export type CreateServicePayload = {
  requester_company_id: string;
  service_type: string;
  [key: string]: any;
};

export async function createService(payload: CreateServicePayload) {
  const { data } = await http.post("/v1/services", payload);
  return data;
}

export async function startService(serviceId: string, start_pin: string) {
  const { data } = await http.post(`/v1/services/${serviceId}/start`, { start_pin });
  return data;
}

export async function closeService(serviceId: string, close_pin: string) {
  const { data } = await http.post(`/v1/services/${serviceId}/close`, { close_pin });
  return data;
}

export async function getActiveOffersByMessenger(messengerId: string) {
  const { data } = await http.get(
    `/v1/messengers/${encodeURIComponent(messengerId)}/offers/active`
  );
  return data;
}

export async function acceptServiceOffer(offerId: string, messengerId: string) {
  const { data } = await http.post(
    `/v1/service-offers/${encodeURIComponent(offerId)}/accept`,
    { messenger_id: messengerId }
  );
  return data;
}

export async function patchMessengerAvailability(
  messengerId: string,
  availability_status: "AVAILABLE" | "OFFLINE"
) {
  const { data } = await http.patch(
    `/v1/messengers/${encodeURIComponent(messengerId)}/availability`,
    { availability_status }
  );
  return data;
}