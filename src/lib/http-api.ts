import { ApiClientError } from "@/lib/data-client";
import type { DataClient } from "@/lib/data-client";
import type {
  ApiErrorBody,
  AppItem,
  AppItemInput,
  AppReorderInput,
  CategoryItem,
  CategoryItemInput,
  User,
} from "@/types/contracts";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // The fallback below covers non-JSON proxy and network responses.
    }
    throw new ApiClientError(
      response.status,
      body?.error.code ?? "REQUEST_FAILED",
      body?.error.message ?? "The request failed.",
      body?.error.fields,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const httpApi: DataClient = {
  async register(username: string, password: string): Promise<User> {
    const response = await request<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return response.user;
  },

  async login(username: string, password: string): Promise<User> {
    const response = await request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return response.user;
  },

  async session(): Promise<User> {
    const response = await request<{ user: User }>("/api/auth/session");
    return response.user;
  },

  logout(): Promise<void> {
    return request("/api/auth/logout", { method: "POST" });
  },

  async listApps(): Promise<AppItem[]> {
    const response = await request<{ apps: AppItem[] }>("/api/apps");
    return response.apps;
  },

  async createApp(input: AppItemInput): Promise<AppItem> {
    const response = await request<{ app: AppItem }>("/api/apps", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.app;
  },

  async updateApp(id: number, input: AppItemInput): Promise<AppItem> {
    const response = await request<{ app: AppItem }>(`/api/apps/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return response.app;
  },

  async reorderApp(input: AppReorderInput): Promise<AppItem[]> {
    const response = await request<{ apps: AppItem[] }>("/api/apps/reorder", {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return response.apps;
  },

  deleteApp(id: number): Promise<void> {
    return request(`/api/apps/${id}`, { method: "DELETE" });
  },

  async listCategories(): Promise<CategoryItem[]> {
    const response = await request<{ categories: CategoryItem[] }>(
      "/api/categories",
    );
    return response.categories;
  },

  async createCategory(input: CategoryItemInput): Promise<CategoryItem> {
    const response = await request<{ category: CategoryItem }>(
      "/api/categories",
      { method: "POST", body: JSON.stringify(input) },
    );
    return response.category;
  },

  async updateCategory(
    id: number,
    input: CategoryItemInput,
  ): Promise<CategoryItem> {
    const response = await request<{ category: CategoryItem }>(
      `/api/categories/${id}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
    return response.category;
  },

  deleteCategory(id: number): Promise<void> {
    return request(`/api/categories/${id}`, { method: "DELETE" });
  },

  reorderCategories(orderedIds: number[]): Promise<void> {
    return request("/api/categories/order", {
      method: "PUT",
      body: JSON.stringify({ orderedIds }),
    });
  },
};
