import { createDemoApi } from "@/lib/demo-api";
import type { DemoApiDependencies } from "@/lib/demo-api";
import type { DataClient } from "@/lib/data-client";
import { httpApi } from "@/lib/http-api";

export { ApiClientError } from "@/lib/data-client";
export type { DataClient } from "@/lib/data-client";

export function selectDataClient(
  mode: string,
  demoDependencies?: DemoApiDependencies,
): DataClient {
  return mode === "demo" ? createDemoApi(demoDependencies) : httpApi;
}

export const api = selectDataClient(import.meta.env.MODE);
