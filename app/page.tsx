"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppShell,
  Box,
  Burger,
  Button,
  Center,
  Group,
  Modal,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
  Transition,
} from "@mantine/core";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconFileImport,
  IconKeyboard,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { ColorSchemeToggle } from "../components/ColorSchemeToggle";
import { Shortcut } from "../components/Shortcut";
import { TextLibrary } from "../components/TextLibrary";
import { TypingTest } from "../components/TypingTest";
import { useStorageKey } from "../components/StorageKeyProvider";
import { useTexts, type TextItem } from "../hooks/useTexts";
import { encodeStorage } from "../utils/storage";

type EditorState = { mode: "create" } | { mode: "edit"; id: string };

function clearAuthCookie() {
  document.cookie = "auth-token=; Path=/; Max-Age=0; SameSite=Lax";
}

function LibrarySkeleton() {
  return (
    <Stack gap="sm" p="sm">
      <Skeleton height={22} width="38%" radius="sm" />
      {Array.from({ length: 6 }, (_, index) => (
        <Stack key={index} gap={6} mt={4}>
          <Skeleton height={12} width={`${70 - (index % 3) * 8}%`} radius="sm" />
          <Skeleton height={10} width="92%" radius="sm" />
        </Stack>
      ))}
    </Stack>
  );
}

function PassageSkeleton() {
  return (
    <Stack p="md" maw={720} gap="sm" mt="md">
      <Skeleton height={18} width={180} radius="sm" />
      <Group gap="xl" mt="xs">
        <Skeleton height={28} width={48} radius="sm" />
        <Skeleton height={28} width={48} radius="sm" />
      </Group>
      <Skeleton height={16} mt="md" radius="sm" />
      <Skeleton height={16} radius="sm" />
      <Skeleton height={16} radius="sm" />
      <Skeleton height={16} width="80%" radius="sm" />
    </Stack>
  );
}

export default function HomePage() {
  const router = useRouter();
  const storageKey = useStorageKey();
  const { texts, ready, add, update, remove, importEncoded } = useTexts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [encodedPayload, setEncodedPayload] = useState("");
  const [copyOpen, setCopyOpen] = useState(false);
  const [importDraft, setImportDraft] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const lastSelectedRef = useRef<TextItem | null>(null);

  const selected = texts.find((item) => item.id === selectedId) ?? null;
  if (selected) {lastSelectedRef.current = selected;}
  const stageText = selected ?? lastSelectedRef.current;
  const canSave = draft.title.trim().length > 0 && draft.content.length > 0;
  const pageModalOpen = editorOpen || deleteOpen || copyOpen || importOpen;

  function logout() {
    clearAuthCookie();
    router.push("/login");
    router.refresh();
  }

  function selectText(id: string) {
    setSelectedId(id);
    closeNav();
  }

  function openCreate() {
    setDraft({ title: "", content: "" });
    setEditor({ mode: "create" });
    setEditorOpen(true);
    closeNav();
  }

  function openEdit(id: string) {
    const item = texts.find((text) => text.id === id);
    if (!item) {return;}
    setDraft({ title: item.title, content: item.content });
    setEditor({ mode: "edit", id });
    setEditorOpen(true);
    closeNav();
  }

  function openCopy(id: string) {
    const item = texts.find((text) => text.id === id);
    if (!item) {return;}
    setEncodedPayload(
      encodeStorage(
        JSON.stringify({ title: item.title, content: item.content }),
        storageKey,
      ),
    );
    setCopyOpen(true);
    closeNav();
  }

  async function copyEncoded() {
    try {
      await navigator.clipboard.writeText(encodedPayload);
      notifications.show({
        title: "Copied",
        message: "Encoded text is on the clipboard.",
        color: "cyan",
        icon: <IconCopy size={18} />,
      });
    } catch {
      notifications.show({
        title: "Could not copy",
        message: "Clipboard access was blocked. Select the encoded text instead.",
        color: "pink",
        icon: <IconAlertCircle size={18} />,
        autoClose: 5000,
      });
    }
  }

  function openImport() {
    setImportDraft("");
    setImportOpen(true);
    closeNav();
  }

  function submitImport() {
    const item = importEncoded(importDraft);
    if (!item) {
      notifications.show({
        title: "Could not import",
        message: "That text could not be decoded.",
        color: "pink",
        icon: <IconAlertCircle size={18} />,
        autoClose: 5000,
      });
      return;
    }
    setSelectedId(item.id);
    setImportOpen(false);
    notifications.show({
      title: "Text imported",
      message: item.title,
      color: "cyan",
      icon: <IconFileImport size={18} />,
    });
  }

  function askDelete(id: string) {
    const item = texts.find((text) => text.id === id);
    if (!item) {return;}
    setEditorOpen(false);
    setPendingDelete({ id: item.id, title: item.title });
    setDeleteOpen(true);
    closeNav();
  }

  function saveText() {
    if (!canSave || !editor) {return;}
    const title = draft.title.trim();
    if (editor.mode === "create") {
      const item = add({ title: draft.title, content: draft.content });
      setSelectedId(item.id);
    } else {
      update(editor.id, { title: draft.title, content: draft.content });
    }
    setEditorOpen(false);
    notifications.show({
      title: "Text saved",
      message: title,
      color: "cyan",
      icon: <IconCheck size={18} />,
    });
  }

  function confirmDelete() {
    if (!pendingDelete) {return;}
    const title = pendingDelete.title;
    remove(pendingDelete.id);
    if (selectedId === pendingDelete.id) {setSelectedId(null);}
    setDeleteOpen(false);
    notifications.show({
      title: "Text deleted",
      message: title,
      color: "pink",
      icon: <IconTrash size={18} />,
    });
  }

  const openCreateRef = useRef(openCreate);
  openCreateRef.current = openCreate;
  const hotkeyBlockedRef = useRef(true);
  hotkeyBlockedRef.current =
    !storageKey || !ready || pageModalOpen || resultsOpen;

  useHotkeys(
    [
      [
        "mod+N",
        (event) => {
          if (hotkeyBlockedRef.current) {return;}
          const target = event.target;
          if (target instanceof HTMLElement) {
            if (
              target.closest(
                "textarea, select, [contenteditable='true'], [role='dialog']",
              )
            ) {
              return;
            }
            if (
              target instanceof HTMLInputElement &&
              target.getAttribute("aria-label") !== "Typing capture"
            ) {
              return;
            }
          }
          event.preventDefault();
          openCreateRef.current();
        },
      ],
    ],
    [],
  );

  if (!storageKey) {
    return (
      <Box mih="100dvh" bg="var(--app-bg)">
        <Group justify="flex-end" p="sm">
          <ColorSchemeToggle />
        </Group>
        <Center mih="calc(100dvh - 52px)" p="md">
          <Text c="pink" ta="center">
            Set STORAGE_ENCRYPTION_KEY in the environment to store texts.
          </Text>
        </Center>
      </Box>
    );
  }

  const library = (
    <TextLibrary
      texts={texts}
      selectedId={selectedId}
      onSelect={selectText}
      onCreate={openCreate}
      onImport={openImport}
      onCopy={openCopy}
      onEdit={openEdit}
      onDelete={askDelete}
      onLogout={logout}
    />
  );

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !navOpened },
      }}
      padding={0}
      withBorder={false}
      transitionDuration={200}
      styles={{
        main: {
          display: "flex",
          flexDirection: "column",
          background: "var(--app-bg)",
          height: "100dvh",
          minHeight: "100dvh",
          overflow: "hidden",
          boxSizing: "border-box",
        },
        header: {
          background: "var(--app-bg)",
          borderBottom: "1px solid var(--app-border)",
        },
        navbar: {
          background: "var(--app-bg)",
          borderRight: "1px solid var(--app-border)",
          overflow: "hidden",
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="sm" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Burger
              opened={navOpened}
              onClick={toggleNav}
              hiddenFrom="sm"
              size="sm"
              aria-label="Texts"
            />
            <Text fw={600} c="cyan">
              Type
            </Text>
          </Group>
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        {ready ? library : <LibrarySkeleton />}
      </AppShell.Navbar>

      <AppShell.Main>
        {ready ? (
          <Box style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <Transition mounted={selected === null} transition="fade" duration={180}>
              {(styles) => (
                <Center
                  style={{ ...styles, position: "absolute", inset: 0 }}
                  p="md"
                >
                  <Stack align="center" gap="xs">
                    <ThemeIcon variant="light" color="cyan" size={52} radius="xl">
                      <IconKeyboard size={26} stroke={1.5} />
                    </ThemeIcon>
                    <Text fw={600}>No text selected</Text>
                    <Text c="dimmed" size="sm" ta="center" maw={320}>
                      Add a passage, then select it to start.
                    </Text>
                    <Tooltip label={<Shortcut keys={["mod", "N"]} />} openDelay={400}>
                      <Button
                        mt="xs"
                        leftSection={<IconPlus size={16} />}
                        onClick={openCreate}
                      >
                        New text
                      </Button>
                    </Tooltip>
                  </Stack>
                </Center>
              )}
            </Transition>
            <Transition mounted={selected !== null} transition="fade" duration={180}>
              {(styles) => (
                <Box
                  style={{
                    ...styles,
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    pointerEvents: selected ? "auto" : "none",
                  }}
                >
                  {stageText ? (
                    <TypingTest
                      key={`${stageText.id}:${stageText.content}`}
                      title={stageText.title}
                      content={stageText.content}
                      active={selected !== null}
                      shortcutsEnabled={!pageModalOpen}
                      onResultsChange={setResultsOpen}
                      onExit={() => setSelectedId(null)}
                    />
                  ) : null}
                </Box>
              )}
            </Transition>
          </Box>
        ) : (
          <PassageSkeleton />
        )}
      </AppShell.Main>

      <Modal
        opened={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editor?.mode === "edit" ? "Edit text" : "New text"}
        size="lg"
        centered
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveText();
          }}
        >
          <Stack gap="sm">
            <TextInput
              label="Title"
              value={draft.title}
              onChange={(event) => {
                const title = event.currentTarget.value;
                setDraft((current) => ({ ...current, title }));
              }}
            />
            <Textarea
              label="Text"
              description="Line breaks are kept."
              value={draft.content}
              onChange={(event) => {
                const content = event.currentTarget.value;
                setDraft((current) => ({ ...current, content }));
              }}
              autosize
              minRows={8}
              maxRows={16}
              styles={{
                input: {
                  fontFamily: "var(--mantine-font-family-monospace)",
                },
              }}
            />
            <Group justify="flex-end">
              <Button
                type="button"
                variant="subtle"
                color="gray"
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSave}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={copyOpen}
        onClose={() => setCopyOpen(false)}
        title="Encoded text"
        size="lg"
        centered
      >
        <Stack gap="sm">
          <Textarea
            label="Base64"
            value={encodedPayload}
            readOnly
            autosize
            minRows={4}
            maxRows={12}
            styles={{
              input: {
                fontFamily: "var(--mantine-font-family-monospace)",
              },
            }}
          />
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setCopyOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                void copyEncoded();
              }}
            >
              Copy
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import text"
        size="lg"
        centered
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitImport();
          }}
        >
          <Stack gap="sm">
            <Textarea
              label="Base64"
              value={importDraft}
              onChange={(event) => {
                setImportDraft(event.currentTarget.value);
              }}
              autosize
              minRows={4}
              maxRows={12}
              styles={{
                input: {
                  fontFamily: "var(--mantine-font-family-monospace)",
                },
              }}
            />
            <Group justify="flex-end">
              <Button
                type="button"
                variant="subtle"
                color="gray"
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={importDraft.trim().length === 0}>
                Import
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete text"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Delete “{pendingDelete?.title}”? This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button color="pink" onClick={confirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}
