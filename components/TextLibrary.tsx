"use client";

import {
  ActionIcon,
  Box,
  Button,
  Group,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCopy,
  IconFileImport,
  IconLogout,
  IconNotes,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import type { TextItem } from "../hooks/useTexts";
import { Shortcut } from "./Shortcut";
import classes from "./TextLibrary.module.css";

type TextLibraryProps = {
  texts: TextItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
  onCopy: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
};

function preview(content: string) {
  const flat = content.replace(/\s+/g, " ").trim();
  if (!flat) {return "";}
  return flat.length > 72 ? `${flat.slice(0, 72)}…` : flat;
}

export function TextLibrary({
  texts,
  selectedId,
  onSelect,
  onCreate,
  onImport,
  onCopy,
  onEdit,
  onDelete,
  onLogout,
}: TextLibraryProps) {
  return (
    <Box h="100%" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Group
        justify="space-between"
        px="sm"
        py="sm"
        wrap="nowrap"
        style={{ borderBottom: "1px solid var(--app-border)", flexShrink: 0 }}
      >
        <Text fw={600}>Texts</Text>
        <Group gap={4} wrap="nowrap">
          <ActionIcon
            aria-label="Import text"
            variant="subtle"
            color="gray"
            onClick={onImport}
          >
            <IconFileImport size={16} />
          </ActionIcon>
          <Tooltip label={<Shortcut keys={["mod", "N"]} />} openDelay={400}>
            <ActionIcon
              aria-label="New text"
              variant="outline"
              color="cyan"
              onClick={onCreate}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
          <ActionIcon
            aria-label="Log out"
            variant="subtle"
            color="gray"
            onClick={onLogout}
          >
            <IconLogout size={16} />
          </ActionIcon>
        </Group>
      </Group>
      <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
        {texts.length === 0 ? (
          <Stack align="center" gap="xs" p="md" mt="lg">
            <ThemeIcon variant="light" color="cyan" size={46} radius="xl">
              <IconNotes size={22} stroke={1.5} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              No texts yet
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Save a passage to start a test.
            </Text>
            <Button size="xs" mt={4} onClick={onCreate}>
              New text
            </Button>
          </Stack>
        ) : (
          texts.map((item) => {
            const selected = item.id === selectedId;
            const blurb = preview(item.content);
            return (
              <div
                key={item.id}
                className={`${classes.row} ${selected ? classes.active : ""}`}
              >
                <UnstyledButton
                  className={classes.label}
                  onClick={() => onSelect(item.id)}
                  aria-current={selected ? "true" : undefined}
                >
                  <Text fw={500} truncate>
                    {item.title}
                  </Text>
                  {blurb ? (
                    <Text size="xs" c="dimmed" truncate>
                      {blurb}
                    </Text>
                  ) : null}
                </UnstyledButton>
                <ActionIcon
                  aria-label={`Copy encoded ${item.title}`}
                  variant="subtle"
                  color="gray"
                  onClick={() => onCopy(item.id)}
                >
                  <IconCopy size={16} />
                </ActionIcon>
                <ActionIcon
                  aria-label={`Edit ${item.title}`}
                  variant="subtle"
                  color="gray"
                  onClick={() => onEdit(item.id)}
                >
                  <IconPencil size={16} />
                </ActionIcon>
                <ActionIcon
                  aria-label={`Delete ${item.title}`}
                  variant="subtle"
                  color="pink"
                  onClick={() => onDelete(item.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </div>
            );
          })
        )}
      </ScrollArea>
    </Box>
  );
}
