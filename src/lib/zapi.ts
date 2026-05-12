export function formatPhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

export async function sendWhatsApp(
  phone: string,
  message: string,
  instanceId: string,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;
  if (!clientToken) throw new Error("ZAPI_CLIENT_TOKEN env var não configurada");

  const formatted = formatPhoneBR(phone);
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  console.log("[ZAPI] sending to:", formatted, "| url:", url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
      body: JSON.stringify({ phone: formatted, message }),
    });

    const body = await res.text();
    console.log("[ZAPI] response:", res.status, body);

    if (!res.ok) {
      return { ok: false, error: `${res.status} ${body}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[ZAPI] fetch error:", err);
    return { ok: false, error: String(err) };
  }
}
