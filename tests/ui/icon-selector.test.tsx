// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";

const registryMock = vi.hoisted(() => {
  const defaultAsset = {
    name: "default-app.svg",
    url: "/default-app.svg",
  };
  const generatedAssets = Array.from({ length: 125 }, (_, index) => ({
    name: `icon-${String(index).padStart(3, "0")}.svg`,
    url: `/icon-${String(index).padStart(3, "0")}.svg`,
  }));
  return {
    defaultAsset,
    iconAssets: [
      defaultAsset,
      { name: "google-drive.svg", url: "/google-drive.svg" },
      ...generatedAssets,
    ],
  };
});

vi.mock("@/assets/registry", () => ({
  DEFAULT_ICON_NAME: registryMock.defaultAsset.name,
  iconAssets: registryMock.iconAssets,
  getIconUrl: (iconName: string) =>
    registryMock.iconAssets.find((asset) => asset.name === iconName)?.url ??
    registryMock.defaultAsset.url,
}));

import { IconSelector } from "@/components/dashboard/icon-selector";
import i18n from "@/i18n";

interface SelectorHarnessProps {
  initialSearch?: string;
  initialValue?: string;
}

function SelectorHarness({
  initialSearch = "",
  initialValue = "default-app.svg",
}: SelectorHarnessProps) {
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [value, setValue] = useState(initialValue);

  return (
    <I18nextProvider i18n={i18n}>
      <IconSelector
        value={value}
        searchValue={searchValue}
        onChange={setValue}
        onSearchChange={setSearchValue}
      />
      <output data-testid="selected-icon">{value}</output>
    </I18nextProvider>
  );
}

describe("IconSelector", () => {
  afterEach(() => {
    cleanup();
  });

  it("normalizes searches and exposes image-only options accessibly", async () => {
    const user = userEvent.setup();
    render(<SelectorHarness initialSearch="Google_Drive.svg" />);

    expect(screen.getByText("1 icons found")).toBeVisible();
    const option = screen.getByRole("radio", { name: "google drive" });
    const image = option.querySelector("img");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");

    await user.click(option);
    expect(screen.getByTestId("selected-icon")).toHaveTextContent(
      "google-drive.svg",
    );
    expect(option).toHaveAttribute("aria-checked", "true");
  });

  it("selects the default icon when a search has no matches", async () => {
    render(
      <SelectorHarness
        initialSearch="not-in-the-catalog"
        initialValue="icon-001.svg"
      />,
    );

    expect(
      screen.getByText("No matching icon. The default icon is selected."),
    ).toBeVisible();
    const defaultOption = screen.getByRole("radio", { name: "default app" });
    await waitFor(() => {
      expect(defaultOption).toHaveAttribute("aria-checked", "true");
    });
    expect(screen.getByTestId("selected-icon")).toHaveTextContent(
      "default-app.svg",
    );
  });

  it("renders results progressively as the grid is scrolled", async () => {
    render(<SelectorHarness />);

    const grid = screen.getByRole("radiogroup", { name: "Icon" });
    expect(screen.getAllByRole("radio")).toHaveLength(60);
    Object.defineProperties(grid, {
      clientHeight: { configurable: true, value: 240 },
      scrollHeight: { configurable: true, value: 1_000 },
      scrollTop: { configurable: true, value: 700 },
    });
    fireEvent.scroll(grid);

    await waitFor(() => {
      expect(screen.getAllByRole("radio")).toHaveLength(120);
    });
  });
});
