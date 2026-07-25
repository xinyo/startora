import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";

import i18n from "@/i18n";
import { ThemeProvider } from "@/providers/theme-provider";
import { RouterProvider } from "@/providers/router-provider";
import { AppRouter } from "@/router";
import "./styles/App.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <RouterProvider>
          <AppRouter />
        </RouterProvider>
      </ThemeProvider>
    </I18nextProvider>
  </StrictMode>,
);
