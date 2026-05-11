function formatPhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

export async function sendWhatsApp(
  phone: string,
  message: string,
  instanceId: string,
  token: string
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formatPhoneBR(phone), message }),
      }
    );
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
