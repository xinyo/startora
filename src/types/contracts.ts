export interface User {
  id: number;
  username: string;
}

export interface AppItem {
  id: number;
  name: string;
  icon: string;
  url: string;
  categoryId: number | null;
  sortId: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppItemInput {
  name: string;
  icon: string;
  url: string;
  categoryId?: number | null;
}

export interface AppReorderInput {
  appId: number;
  categoryId: number | null;
  position: number;
}

export interface CategoryItem {
  id: number;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryItemInput {
  name: string;
  position?: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
