import { apiClient } from "./client";

export interface PublicTicketPayload {
  name: string;
  phone: string;
  title: string;
  category: string;
  message: string;
  orderNumber?: string;
  captchaToken: string;
  attachment?: File | null;
}

export async function createPublicTicket(payload: PublicTicketPayload) {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value instanceof File) form.append("attachment", value);
    else if (value !== undefined && value !== null) form.append(key, String(value));
  }
  const { data } = await apiClient.post("/public/tickets", form, { headers: { "Content-Type": "multipart/form-data" } });
  return data as { trackingCode: string; ticket: { title: string; status: string } };
}

export async function trackPublicTicket(phone: string, trackingCode: string) {
  const { data } = await apiClient.post("/public/tickets/track", { phone, trackingCode });
  return data.ticket as {
    trackingCode: string;
    title: string;
    description: string;
    status: string;
    category: string;
    createdAt: string;
    messages: Array<{ id: string; sender: "CUSTOMER" | "STAFF"; content: string; createdAt: string }>;
  };
}

export async function replyPublicTicket(payload: { phone: string; trackingCode: string; content: string; captchaToken: string }) {
  return (await apiClient.post("/public/tickets/reply", payload)).data;
}

export async function fetchPublicFaq() {
  return (await apiClient.get("/public/faq")).data.items as Array<{
    id: string; category: string; questionFa: string; questionEn: string; answerFa: string; answerEn: string; sortOrder: number;
  }>;
}
