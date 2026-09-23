"use client";

import { useCallback, useEffect, useState } from "react";
import { useStorageKey } from "../components/StorageKeyProvider";
import { decodeStorage, encodeStorage } from "../utils/storage";

const STORAGE_KEY = "ltt-texts";

export type TextItem = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
};

function isTextItem(value: unknown): value is TextItem {
  if (!value || typeof value !== "object") {return false;}
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.content === "string" &&
    typeof item.createdAt === "number"
  );
}

function normalizeContent(content: string) {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function readTexts(key: string): TextItem[] {
  if (!key || typeof window === "undefined") {return [];}
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {return [];}

  try {
    const parsed: unknown = JSON.parse(decodeStorage(raw, key));
    if (!Array.isArray(parsed)) {return [];}
    return parsed
      .filter(isTextItem)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function writeTexts(key: string, texts: TextItem[]) {
  if (!key) {return;}
  localStorage.setItem(STORAGE_KEY, encodeStorage(JSON.stringify(texts), key));
}

export function useTexts() {
  const key = useStorageKey();
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTexts(readTexts(key));
    setReady(true);
  }, [key]);

  const add = useCallback(
    (input: { title: string; content: string }) => {
      const item: TextItem = {
        id: crypto.randomUUID(),
        title: input.title.trim(),
        content: normalizeContent(input.content),
        createdAt: Date.now(),
      };
      setTexts((current) => {
        const next = [item, ...current];
        writeTexts(key, next);
        return next;
      });
      return item;
    },
    [key],
  );

  const update = useCallback(
    (id: string, input: { title: string; content: string }) => {
      setTexts((current) => {
        const next = current.map((item) =>
          item.id === id
            ? {
                ...item,
                title: input.title.trim(),
                content: normalizeContent(input.content),
              }
            : item,
        );
        writeTexts(key, next);
        return next;
      });
    },
    [key],
  );

  const remove = useCallback(
    (id: string) => {
      setTexts((current) => {
        const next = current.filter((item) => item.id !== id);
        writeTexts(key, next);
        return next;
      });
    },
    [key],
  );

  const importEncoded = useCallback(
    (payload: string) => {
      const trimmed = payload.trim();
      if (!trimmed) {return null;}

      let decoded: string;
      try {
        decoded = decodeStorage(trimmed, key);
      } catch {
        return null;
      }

      let title = "Imported";
      let content = decoded;
      try {
        const parsed: unknown = JSON.parse(decoded);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof (parsed as { title?: unknown }).title === "string" &&
          typeof (parsed as { content?: unknown }).content === "string"
        ) {
          const item = parsed as { title: string; content: string };
          title = item.title;
          content = item.content;
        }
      } catch {
        // Decoded text is not JSON; keep it as the passage.
      }

      return add({ title, content });
    },
    [add, key],
  );

  return { texts, ready, add, update, remove, importEncoded };
}
