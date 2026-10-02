const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (configuredBaseUrl || '/api').replace(/\/+$/, '');

function currentSession() {
  try {
    const raw = localStorage.getItem('sree-super-market-session') || sessionStorage.getItem('sree-super-market-session');
    return raw ? JSON.parse(raw) as { id?: string; name?: string; email?: string; role?: string } : {};
  } catch {
    return {};
  }
}

function endpointUrl(path: string) {
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = endpointUrl(path);
  const headers = new Headers(options?.headers);
  const session = currentSession();
  headers.set('Content-Type', 'application/json');
  headers.set('X-User-Role', session.role || '');
  headers.set('X-User-Id', session.id || '');
  headers.set('X-User-Name', session.name || '');
  headers.set('X-User-Email', session.email || '');

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error) {
    if (import.meta.env.DEV) console.error(`Backend request failed: ${url}`, error);
    throw new Error('Backend server is not reachable. Please start the Sree Super Market backend.');
  }

  let body: { success?: boolean; data?: T; message?: string };
  try {
    body = await response.json() as { success?: boolean; data?: T; message?: string };
  } catch {
    body = {};
  }

  if (!response.ok || body.success === false) {
    if (response.status === 404) {
      if (import.meta.env.DEV) console.error(`API endpoint returned 404: ${url}`);
      throw new Error(body.message || `API endpoint not found: ${url}`);
    }
    throw new Error(body.message || `Request failed with status ${response.status}.`);
  }

  return body.data as T;
}