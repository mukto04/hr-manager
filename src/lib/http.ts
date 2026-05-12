export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    const text = await response.text();
    console.warn(`[getJson] Expected JSON but received HTML from ${url}`);
    throw new Error(`Received HTML instead of JSON from ${url}`);
  }

  if (!response.ok) {
    const errObj = await response.json().catch(() => ({}));
    const message = errObj.error || errObj.message || "Failed to fetch data";
    throw new Error(message);
  }
  return response.json();
}

export async function sendJson<T>(url: string, method: "POST" | "PUT" | "DELETE" | "PATCH", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errObj = await response.json().catch(() => ({}));
    const detail = typeof errObj.error === 'string' ? errObj.error : JSON.stringify(errObj.error);
    throw new Error(detail || errObj.message || "Request failed");
  }

  return response.json();
}
