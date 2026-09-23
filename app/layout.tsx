import type { ReactNode } from "react";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { AppProviders } from "../components/AppProviders";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

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
    <html
      lang="en"
      {...mantineHtmlProps}
      className={`${dmSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <style>{`
          html[data-mantine-color-scheme="light"] body {
            background: #f3f5f7;
            color: #1c1e26;
          }
          html[data-mantine-color-scheme="dark"] body,
          html:not([data-mantine-color-scheme="light"]) body {
            background: #0f0f13;
            color: #e8e8f0;
          }
        `}</style>
      </head>
      <body>
        <AppProviders storageKey={storageKey}>{children}</AppProviders>
      </body>
    </html>
  );
}
