"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, clearTokens } from "@/lib/api";

export type AuthUser = {
  id: string;
  userCode: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  tenantId?: string | null;
  tenant?: { id: string; name: string; slug: string } | null;
  roles: string[];
  permissions: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{
        success: boolean;
        data: { user: AuthUser };
      }>("/auth/me");
      if (data.success && data.data?.user) {
        setUser(data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const logout = useCallback(async () => {
    const refresh =
      typeof window !== "undefined"
        ? localStorage.getItem("refreshToken")
        : null;
    if (refresh) {
      try {
        await api.post("/auth/logout", { refreshToken: refresh });
      } catch {
        /* ignore */
      }
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, refreshMe, logout }),
    [user, isLoading, refreshMe, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function hasPermission(user: AuthUser | null, code: string): boolean {
  return Boolean(user?.permissions?.includes(code));
}

export function isCustomerOnly(user: AuthUser | null): boolean {
  return Boolean(
    user && user.roles.length > 0 && user.roles.every((r) => r === "CUSTOMER"),
  );
}

/** Customer registered but not yet assigned to a tenant (join request pending). */
export function customerNeedsTenant(user: AuthUser | null): boolean {
  return isCustomerOnly(user) && !user?.tenantId;
}

/** Role-aware default after login / register. */
export function defaultDashboardPath(
  roles: string[],
  tenantId?: string | null,
): string {
  const onlyCustomer = roles.length === 1 && roles[0] === "CUSTOMER";
  if (onlyCustomer && !tenantId) {
    return "/dashboard/pending-tenant";
  }
  if (onlyCustomer) {
    return "/dashboard/booking";
  }
  return "/dashboard";
}
