// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => {
  class ApiClientError extends Error {
    status: number;
    code: string;
    fields?: Record<string, string>;

    constructor(
      status: number,
      code: string,
      message: string,
      fields?: Record<string, string>,
    ) {
      super(message);
      this.status = status;
      this.code = code;
      this.fields = fields;
    }
  }

  return {
    ApiClientError,
    api: {
      session: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      listApps: vi.fn(),
      createApp: vi.fn(),
      updateApp: vi.fn(),
      deleteApp: vi.fn(),
    },
  };
});

import App from "@/App";
import i18n from "@/i18n";
import { api } from "@/lib/api";
import { AppRouter } from "@/router";
import { useAppStore } from "@/store";
import type { AppItem } from "@/types/contracts";

const firstApp: AppItem = {
  id: 1,
  name: "Missing icon app",
  icon: "missing.svg",
  url: "https://example.com/path",
  createdAt: "2026-07-23T00:00:00Z",
  updatedAt: "2026-07-23T00:00:00Z",
};

function renderWithProviders(ui: ReactNode) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>,
  );
}

function setAuthenticated(apps: AppItem[] = []): void {
  useAppStore.setState({
    authStatus: "authenticated",
    user: { id: 1, username: "Ada" },
    appsById: Object.fromEntries(apps.map((appItem) => [appItem.id, appItem])),
    appIds: apps.map((appItem) => appItem.id),
    errorCode: null,
  });
}

describe("dashboard UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticated();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the username, safe external link attributes, and missing-icon fallback", () => {
    setAuthenticated([firstApp]);
    renderWithProviders(<App />);

    expect(screen.getByRole("heading", { name: "Welcome, Ada" })).toBeVisible();
    const link = screen.getByRole("link", { name: "Open Missing icon app" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("href", firstApp.url);
    expect(screen.getByText("M")).toBeVisible();
  });

  it("creates, edits, and deletes an app through accessible dialogs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);
    const created: AppItem = {
      ...firstApp,
      id: 2,
      name: "Figma",
      icon: "default-app.svg",
      url: "https://figma.com/",
    };
    vi.mocked(api.createApp).mockResolvedValue(created);

    await user.click(screen.getAllByRole("button", { name: "Add app" })[0]);
    let dialog = await screen.findByRole("dialog", { name: "Add an app" });
    await user.type(within(dialog).getByLabelText("App name"), "Figma");
    await user.type(
      within(dialog).getByLabelText("Web address"),
      "https://figma.com",
    );
    await user.click(within(dialog).getByRole("button", { name: "Add app" }));
    expect(await screen.findByText("Figma")).toBeVisible();

    const updated = { ...created, name: "Figma Design" };
    vi.mocked(api.updateApp).mockResolvedValue(updated);
    await user.click(screen.getByRole("button", { name: "Edit Figma" }));
    dialog = await screen.findByRole("dialog", { name: "Edit app" });
    const nameInput = within(dialog).getByLabelText("App name");
    await user.clear(nameInput);
    await user.type(nameInput, "Figma Design");
    await user.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );
    expect(await screen.findByText("Figma Design")).toBeVisible();

    vi.mocked(api.deleteApp).mockResolvedValue();
    await user.click(
      screen.getByRole("button", { name: "Delete Figma Design" }),
    );
    dialog = await screen.findByRole("dialog", {
      name: "Delete Figma Design?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Delete app" }),
    );
    await waitFor(() => {
      expect(screen.queryByText("Figma Design")).not.toBeInTheDocument();
    });
  });

  it("redirects protected pages and auto-enters the dashboard after registration", async () => {
    useAppStore.setState({
      authStatus: "anonymous",
      user: null,
      appsById: {},
      appIds: [],
      errorCode: null,
    });
    const user = userEvent.setup();
    vi.mocked(api.register).mockResolvedValue({ id: 3, username: "New.User" });

    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={["/"]}>
          <AppRouter />
        </MemoryRouter>
      </I18nextProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Your apps, one clean start.",
      }),
    ).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Create account" }));
    await user.type(screen.getByLabelText("Username"), "New.User");
    await user.type(screen.getByLabelText("Password"), "password-one");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome, New.User" }),
    ).toBeVisible();
  });

  it("clears the session and returns to welcome on logout", async () => {
    const user = userEvent.setup();
    vi.mocked(api.logout).mockResolvedValue();

    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={["/"]}>
          <AppRouter />
        </MemoryRouter>
      </I18nextProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(
      await screen.findByRole("heading", {
        name: "Your apps, one clean start.",
      }),
    ).toBeVisible();
    expect(useAppStore.getState().user).toBeNull();
  });
});
