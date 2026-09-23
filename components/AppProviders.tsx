"use client";

import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { cssVariablesResolver, theme } from "../theme";
import { StorageKeyProvider } from "./StorageKeyProvider";

export function AppProviders({
  storageKey,
  children,
}: {
  storageKey: string;
  children: ReactNode;
}) {
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme="dark"
      cssVariablesResolver={cssVariablesResolver}
    >
      <Notifications position="top-right" />
      <StorageKeyProvider value={storageKey}>{children}</StorageKeyProvider>
    </MantineProvider>
  );
}
