"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import { IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import classes from "./TypingTest.module.css";

type TypingTestProps = {
  title: string;
  content: string;
  onExit: () => void;
};

type Engine = {
  index: number;
  mistake: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  keystrokes: number;
  mistakes: number;
};

type Action =
  | { type: "char"; char: string }
  | { type: "backspace" };

function createEngine(): Engine {
  return {
    index: 0,
    mistake: false,
    startedAt: null,
    finishedAt: null,
    keystrokes: 0,
    mistakes: 0,
  };
}

function reduce(state: Engine, action: Action, chars: string[]): Engine {
  if (state.finishedAt !== null) {return state;}

  if (action.type === "backspace") {
    if (state.mistake) {return { ...state, mistake: false };}
    if (state.index > 0) {return { ...state, index: state.index - 1 };}
    return state;
  }

  if (state.mistake || state.index >= chars.length) {return state;}

  const now = Date.now();
  const startedAt = state.startedAt ?? now;
  const keystrokes = state.keystrokes + 1;

  if (action.char === chars[state.index]) {
    const index = state.index + 1;
    return {
      ...state,
      index,
      startedAt,
      keystrokes,
      finishedAt: index === chars.length ? now : null,
    };
  }

  return {
    ...state,
    mistake: true,
    startedAt,
    keystrokes,
    mistakes: state.mistakes + 1,
  };
}

function isTypingTarget(target: EventTarget | null, capture: HTMLInputElement | null) {
  if (!(target instanceof HTMLElement)) {return true;}
  if (target === capture) {return true;}
  if (
    target.closest(
      "button, a, textarea, [contenteditable='true'], [role='dialog']",
    ) ||
    (target instanceof HTMLInputElement && target !== capture)
  ) {
    return false;
  }
  return true;
}

export function TypingTest({ title, content, onExit }: TypingTestProps) {
  const chars = Array.from(content);
  const charsRef = useRef(chars);
  charsRef.current = chars;

  const [engine, setEngine] = useState<Engine>(createEngine);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const handledByKeydown = useRef(false);

  const applyChars = useCallback((input: string) => {
    const pieces = Array.from(input);
    setEngine((current) => {
      let next = current;
      for (const char of pieces) {
        next = reduce(next, { type: "char", char }, charsRef.current);
      }
      return next;
    });
  }, []);

  const applyBackspace = useCallback(() => {
    setEngine((current) => reduce(current, { type: "backspace" }, charsRef.current));
  }, []);

  const restart = useCallback(() => {
    setEngine(createEngine());
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [content]);

  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [engine.index, engine.mistake]);

  useWindowEvent("keydown", (event) => {
    if (event.repeat || event.isComposing) {return;}
    if (event.metaKey || event.ctrlKey || event.altKey) {return;}
    if (!isTypingTarget(event.target, inputRef.current)) {return;}

    const finished = engine.finishedAt !== null;
    if (finished) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button")) {return;}
      if (
        event.key === "Backspace" ||
        event.key === "Enter" ||
        event.key.length === 1
      ) {
        event.preventDefault();
      }
      return;
    }

    const markKeydown = () => {
      handledByKeydown.current = true;
      window.setTimeout(() => {
        handledByKeydown.current = false;
      }, 0);
    };

    if (event.key === "Backspace") {
      event.preventDefault();
      markKeydown();
      applyBackspace();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      markKeydown();
      applyChars("\n");
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      markKeydown();
      applyChars(event.key);
    }
  });

  function onBeforeInput(event: FormEvent<HTMLInputElement>) {
    event.preventDefault();
    if (handledByKeydown.current) {return;}
    const native = event.nativeEvent;
    if (!(native instanceof InputEvent)) {return;}
    if (native.inputType === "deleteContentBackward") {
      applyBackspace();
      return;
    }
    if (native.inputType === "insertLineBreak") {
      applyChars("\n");
      return;
    }
    if (
      (native.inputType === "insertText" ||
        native.inputType === "insertCompositionText") &&
      native.data
    ) {
      applyChars(native.data);
    }
  }

  let wpm = 0;
  const finished = engine.finishedAt !== null && engine.startedAt !== null;
  if (engine.finishedAt !== null && engine.startedAt !== null) {
    const elapsed = Math.max(engine.finishedAt - engine.startedAt, 1);
    wpm = Math.round(chars.length / 5 / (elapsed / 60000));
  }
  const accuracy =
    engine.keystrokes === 0
      ? 100
      : Math.round(
          ((engine.keystrokes - engine.mistakes) / engine.keystrokes) * 100,
        );

  const lines: { ch: string; i: number }[][] = [];
  let current: { ch: string; i: number }[] = [];
  chars.forEach((ch, i) => {
    current.push({ ch, i });
    if (ch === "\n") {
      lines.push(current);
      current = [];
    }
  });
  if (current.length > 0) {lines.push(current);}

  return (
    <Box className={classes.root}>
      <Group justify="space-between" mb="md" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <ActionIcon
            aria-label="Back to menu"
            variant="subtle"
            color="gray"
            onClick={onExit}
          >
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Text fw={600} truncate>
            {title}
          </Text>
        </Group>
        <ActionIcon
          aria-label="Restart"
          variant="subtle"
          color="cyan"
          onClick={restart}
        >
          <IconRefresh size={18} />
        </ActionIcon>
      </Group>

      <Box
        className={classes.stage}
        onMouseDown={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          className={classes.capture}
          aria-label="Typing capture"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onBeforeInput={onBeforeInput}
          onChange={(event) => {
            event.currentTarget.value = "";
          }}
        />
        <div
          className={`${classes.passage} ${
            focused || finished ? "" : classes.blurred
          }`}
        >
          {lines.map((line, lineIndex) => (
            <div key={line[0]?.i ?? lineIndex} className={classes.line}>
              {line.map(({ ch, i }) => {
                const isCorrect = i < engine.index;
                const isCurrent = i === engine.index && !finished;
                const isMistake = isCurrent && engine.mistake;
                const isCaret = isCurrent && !engine.mistake;
                const className = [
                  classes.char,
                  ch === "\n" ? classes.newline : "",
                  isCorrect ? classes.correct : "",
                  isMistake ? classes.mistake : "",
                  isCaret ? classes.caret : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <span
                    key={i}
                    ref={isCurrent ? caretRef : undefined}
                    className={className}
                    data-caret={isCaret ? "true" : undefined}
                    data-mistake={isMistake ? "true" : undefined}
                  >
                    {ch === "\n" ? "↵" : ch}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        {!focused && !finished ? <div className={classes.hint}>Click to focus</div> : null}
      </Box>

      <Text hiddenFrom="sm" size="xs" c="dimmed" mt="sm">
        Tap the passage to open the keyboard. Correct mistakes with Backspace
        before continuing.
      </Text>

      <Modal
        opened={finished}
        onClose={() => undefined}
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        title="Complete"
        centered
      >
        <Stack gap="lg">
          <Group grow>
            <Stack gap={0} align="center">
              <Text fz={48} fw={600} c="cyan" lh={1}>
                {wpm}
              </Text>
              <Text size="sm" c="dimmed">
                WPM
              </Text>
            </Stack>
            <Stack gap={0} align="center">
              <Text fz={48} fw={600} c="pink" lh={1}>
                {accuracy}%
              </Text>
              <Text size="sm" c="dimmed">
                Accuracy
              </Text>
            </Stack>
          </Group>
          <Group grow>
            <Button onClick={restart}>Restart</Button>
            <Button color="pink" onClick={onExit}>
              Back to menu
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
