export interface User {
  id: number;
  username: string;
}

export interface AppItem {
  id: number;
  name: string;
  icon: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppItemInput {
  name: string;
  icon: string;
  url: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
