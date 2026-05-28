import { pinia } from "@/client/pinia";
import { useStore } from "@/client/store";

export async function resolveAuthNavigationWithStore(
  store: {
    ensureInitialized: () => Promise<void>;
    isAuthenticated: boolean;
  },
  to: {
    path: string;
    meta?: { requiresAuth?: boolean };
  },
) {
  await store.ensureInitialized();

  if (to.meta?.requiresAuth && !store.isAuthenticated) {
    return "/login";
  }

  if (to.path === "/login" && store.isAuthenticated) {
    return "/";
  }

  return true;
}

export async function resolveAuthNavigation(to: {
  path: string;
  meta?: { requiresAuth?: boolean };
}) {
  const store = useStore(pinia);
  return resolveAuthNavigationWithStore(store, to);
}
