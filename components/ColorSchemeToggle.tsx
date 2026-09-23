"use client";

import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });
  const next = scheme === "dark" ? "light" : "dark";

  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      aria-label={scheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setColorScheme(next)}
    >
      {scheme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
    </ActionIcon>
  );
}
