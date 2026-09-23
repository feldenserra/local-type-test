"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Center,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { ColorSchemeToggle } from "../../components/ColorSchemeToggle";

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
    <Box mih="100dvh" bg="var(--app-bg)">
      <Group justify="flex-end" p="sm">
        <ColorSchemeToggle />
      </Group>
      <Center mih="calc(100dvh - 52px)" px="md" pb="xl">
        <Paper
          withBorder
          p="xl"
          radius="md"
          w="100%"
          maw={400}
          style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
        >
          <Stack gap="md">
            <div>
              <Title order={2} c="cyan">
                Type
              </Title>
              <Text c="dimmed" size="sm" mt={4}>
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
        </Paper>
      </Center>
    </Box>
  );
}
