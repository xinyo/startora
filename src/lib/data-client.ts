import type {
  AppItem,
  AppItemInput,
  AppReorderInput,
  CategoryItem,
  CategoryItemInput,
  User,
} from "@/types/contracts";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export interface DataClient {
  register(username: string, password: string): Promise<User>;
  login(username: string, password: string): Promise<User>;
  session(): Promise<User>;
  logout(): Promise<void>;
  listApps(): Promise<AppItem[]>;
  createApp(input: AppItemInput): Promise<AppItem>;
  updateApp(id: number, input: AppItemInput): Promise<AppItem>;
  reorderApp(input: AppReorderInput): Promise<AppItem[]>;
  deleteApp(id: number): Promise<void>;
  listCategories(): Promise<CategoryItem[]>;
  createCategory(input: CategoryItemInput): Promise<CategoryItem>;
  updateCategory(
    id: number,
    input: CategoryItemInput,
  ): Promise<CategoryItem>;
  deleteCategory(id: number): Promise<void>;
  reorderCategories(orderedIds: number[]): Promise<void>;
}
