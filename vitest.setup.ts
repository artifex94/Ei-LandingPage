import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

// next/link necesita el router de Next; en jsdom lo reemplazamos por un <a> simple.
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string | { toString(): string };
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement(
      "a",
      { href: typeof href === "string" ? href : String(href), ...props },
      children,
    ),
}));
