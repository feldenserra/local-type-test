"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Center,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";

const AUTH_COOKIE = "auth-token=1; Path=/; Max-Age=2592000; SameSite=Lax";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Wrong password.");
        } else if (response.status === 500) {
          setError("The app password is not configured.");
        } else {
          setError("Could not sign in.");
        }
        return;
      }

      document.cookie = AUTH_COOKIE;
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Center mih="100dvh" px="md">
      <Stack w="100%" maw={360} gap="md">
        <div>
          <Title order={2} c="cyan">
            Type
          </Title>
          <Text c="dimmed" size="sm">
            Enter the app password.
          </Text>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Stack gap="sm">
            <PasswordInput
              label="Password"
              name="password"
              value={password}
              onChange={(event) => {
                setPassword(event.currentTarget.value);
                setError(null);
              }}
              error={error}
              autoFocus
              autoComplete="current-password"
            />
            <Button type="submit" fullWidth loading={loading}>
              Continue
            </Button>
          </Stack>
        </form>
      </Stack>
    </Center>
  );
}
