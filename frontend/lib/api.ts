import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const baseURL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api`;

export const api = axios.create({ baseURL });

let accessToken: string | null = null;
let refreshToken: string | null = null;

function syncFromStorage(): void {
  if (typeof window === "undefined") return;
  accessToken = localStorage.getItem("accessToken");
  refreshToken = localStorage.getItem("refreshToken");
}

export function persistTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  }
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  syncFromStorage();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      refreshToken &&
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/login")
    ) {
      original._retry = true;
      try {
        const { data } = await axios.post<{
          success: boolean;
          data: { accessToken: string; refreshToken: string };
        }>(`${baseURL}/auth/refresh`, { refreshToken });
        if (data.success && data.data) {
          persistTokens(data.data.accessToken, data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        }
      } catch {
        clearTokens();
      }
    }
    return Promise.reject(error);
  },
);
