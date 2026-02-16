const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const api = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || 'Request failed');
  }

  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
};
