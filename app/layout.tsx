import type { ReactNode } from "react";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { AppProviders } from "../components/AppProviders";

export const metadata = {
  title: "Type",
  description: "A minimal typing test",
  icons: { icon: "/favicon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const storageKey = process.env.STORAGE_ENCRYPTION_KEY ?? "";

  return (
    <html lang="en" {...mantineHtmlProps} data-mantine-color-scheme="dark">
      <head>
        <ColorSchemeScript forceColorScheme="dark" />
      </head>
      <body style={{ background: "#0f0f13", color: "#e8e8f0" }}>
        <AppProviders storageKey={storageKey}>{children}</AppProviders>
      </body>
    </html>
  );
}
