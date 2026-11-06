export function json<T = unknown>(data: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function redirect(url: string, status: number = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  });
}

export function html(content: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "text/html; charset=utf-8");
  }

  return new Response(content, {
    ...init,
    headers,
  });
}

