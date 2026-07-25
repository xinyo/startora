import type { BrowserRouterProps } from "react-router";
import { BrowserRouter } from "react-router";

export const RouterProvider = (props: BrowserRouterProps) => (
  <BrowserRouter {...props} />
);
