"use client";

import { createContext, useContext } from "react";

const StorageKeyContext = createContext("");

export function StorageKeyProvider({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <StorageKeyContext.Provider value={value}>
      {children}
    </StorageKeyContext.Provider>
  );
}

export function useStorageKey() {
  return useContext(StorageKeyContext);
}
