"use client";

import { useEffect, useState } from "react";
import { Kbd } from "@mantine/core";

type KeyName = "mod" | "Enter" | "Esc" | "N";

const labels: Record<Exclude<KeyName, "mod">, string> = {
  Enter: "Enter",
  Esc: "Esc",
  N: "N",
};

export function Shortcut({ keys }: { keys: KeyName[] }) {
  const [mod, setMod] = useState("Ctrl");

  useEffect(() => {
    if (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent)) {
      setMod("⌘");
    }
  }, []);

  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {keys.map((key) => (
        <Kbd key={key} size="xs">
          {key === "mod" ? mod : labels[key]}
        </Kbd>
      ))}
    </span>
  );
}
