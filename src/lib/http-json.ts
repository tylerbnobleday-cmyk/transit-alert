function getContentType(response: Response) {
  return response.headers.get("content-type") ?? "";
}

function isJsonContentType(contentType: string) {
  return /\bjson\b/i.test(contentType);
}

export function responseIsJson(response: Response) {
  return isJsonContentType(getContentType(response));
}

function compactPreview(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

export async function readJsonResponse<T>(response: Response, label: string): Promise<T> {
  const contentType = getContentType(response);
  if (!isJsonContentType(contentType)) {
    const preview = compactPreview(await response.text().catch(() => ""));
    const suffix = preview ? `: ${preview}` : "";
    throw new Error(`${label} returned ${contentType || "non-JSON"} instead of JSON${suffix}`);
  }

  return (await response.json()) as T;
}

export async function readJsonErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = getContentType(response);
  if (!isJsonContentType(contentType)) {
    return fallback;
  }

  try {
    const payload = (await response.json()) as { error?: string };
    return payload?.error || fallback;
  } catch {
    return fallback;
  }
}
