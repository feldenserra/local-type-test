"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Center,
  Drawer,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMenu2 } from "@tabler/icons-react";
import { TextLibrary } from "../components/TextLibrary";
import { TypingTest } from "../components/TypingTest";
import { useStorageKey } from "../components/StorageKeyProvider";
import { useTexts } from "../hooks/useTexts";
import { encodeStorage } from "../utils/storage";

type EditorState = { mode: "create" } | { mode: "edit"; id: string };

function clearAuthCookie() {
  document.cookie = "auth-token=; Path=/; Max-Age=0; SameSite=Lax";
}

export default function HomePage() {
  const router = useRouter();
  const storageKey = useStorageKey();
  const { texts, ready, add, update, remove, importEncoded } = useTexts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpened, setDrawerOpened] = useState(false);
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

  const selected = texts.find((item) => item.id === selectedId) ?? null;
  const canSave = draft.title.trim().length > 0 && draft.content.length > 0;

  function logout() {
    clearAuthCookie();
    router.push("/login");
    router.refresh();
  }

  function selectText(id: string) {
    setSelectedId(id);
    setDrawerOpened(false);
  }

  function openCreate() {
    setDraft({ title: "", content: "" });
    setEditor({ mode: "create" });
    setEditorOpen(true);
    setDrawerOpened(false);
  }

  function openEdit(id: string) {
    const item = texts.find((text) => text.id === id);
    if (!item) {return;}
    setDraft({ title: item.title, content: item.content });
    setEditor({ mode: "edit", id });
    setEditorOpen(true);
    setDrawerOpened(false);
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
    setDrawerOpened(false);
  }

  async function copyEncoded() {
    try {
      await navigator.clipboard.writeText(encodedPayload);
      notifications.show({ message: "Copied", color: "cyan" });
    } catch {
      // The encoded text stays visible if the clipboard is blocked.
    }
  }

  function openImport() {
    setImportDraft("");
    setImportOpen(true);
    setDrawerOpened(false);
  }

  function submitImport() {
    const item = importEncoded(importDraft);
    if (!item) {return;}
    setSelectedId(item.id);
    setImportOpen(false);
    notifications.show({ message: "Text imported", color: "cyan" });
  }

  function askDelete(id: string) {
    const item = texts.find((text) => text.id === id);
    if (!item) {return;}
    setEditorOpen(false);
    setPendingDelete({ id: item.id, title: item.title });
    setDeleteOpen(true);
    setDrawerOpened(false);
  }

  function saveText() {
    if (!canSave || !editor) {return;}
    if (editor.mode === "create") {
      const item = add({ title: draft.title, content: draft.content });
      setSelectedId(item.id);
    } else {
      update(editor.id, { title: draft.title, content: draft.content });
    }
    setEditorOpen(false);
    notifications.show({ message: "Text saved", color: "cyan" });
  }

  function confirmDelete() {
    if (!pendingDelete) {return;}
    remove(pendingDelete.id);
    if (selectedId === pendingDelete.id) {setSelectedId(null);}
    setDeleteOpen(false);
    notifications.show({ message: "Text deleted", color: "pink" });
  }

  if (!storageKey) {
    return (
      <Center mih="100dvh" p="md">
        <Text c="pink" ta="center">
          Set STORAGE_ENCRYPTION_KEY in the environment to store texts.
        </Text>
      </Center>
    );
  }

  if (!ready) {
    return <Box mih="100dvh" />;
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
    <Box style={{ display: "flex", minHeight: "100dvh", background: "#0f0f13" }}>
      <Box
        visibleFrom="sm"
        w={300}
        h="100dvh"
        style={{ flex: "0 0 300px", borderRight: "1px solid #2a2a38" }}
      >
        {library}
      </Box>

      <Box
        component="main"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Group
          hiddenFrom="sm"
          justify="space-between"
          px="sm"
          h={52}
          wrap="nowrap"
          style={{ borderBottom: "1px solid #2a2a38", flexShrink: 0 }}
        >
          <Button
            variant="subtle"
            leftSection={<IconMenu2 size={16} />}
            onClick={() => setDrawerOpened(true)}
          >
            Texts
          </Button>
        </Group>

        <Box style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {selected ? (
            <TypingTest
              key={`${selected.id}:${selected.content}`}
              title={selected.title}
              content={selected.content}
              onExit={() => setSelectedId(null)}
            />
          ) : (
            <Center style={{ flex: 1 }} p="md">
              <Stack align="center" gap="xs">
                <Text c="cyan" fw={600}>
                  No text selected
                </Text>
                <Text c="dimmed" size="sm" ta="center">
                  Add a passage, then select it to start.
                </Text>
                <Button mt="xs" onClick={openCreate}>
                  New text
                </Button>
              </Stack>
            </Center>
          )}
        </Box>
      </Box>

      <Drawer
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
        padding={0}
        withCloseButton={false}
        size={320}
        styles={{
          content: { background: "#0f0f13" },
          body: { height: "100%", padding: 0 },
        }}
      >
        {library}
      </Drawer>

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
    </Box>
  );
}
