import { api, persistTokens } from "@/lib/api";

export async function loginDemo(): Promise<boolean> {
  try {
    const { data } = await api.post<{
      success: boolean;
      data: { accessToken: string; refreshToken: string };
    }>("/auth/demo");

    if (data.success && data.data) {
      persistTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Demo login failed:", error);
    return false;
  }
}