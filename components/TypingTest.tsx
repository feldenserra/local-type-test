"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
  Transition,
} from "@mantine/core";
import { useHotkeys, useInterval, useWindowEvent } from "@mantine/hooks";
import { IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import { Shortcut } from "./Shortcut";
import classes from "./TypingTest.module.css";

type TypingTestProps = {
  title: string;
  content: string;
  onExit: () => void;
  active?: boolean;
  shortcutsEnabled?: boolean;
  onResultsChange?: (open: boolean) => void;
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

type CaretBox = {
  x: number;
  y: number;
  h: number;
};

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

function isForeignField(target: EventTarget | null, capture: HTMLInputElement | null) {
  if (!(target instanceof HTMLElement)) {return false;}
  if (target.closest("textarea, select, [contenteditable='true']")) {return true;}
  if (target instanceof HTMLInputElement && target !== capture) {return true;}
  return false;
}

function formatElapsed(ms: number) {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {return `${totalSeconds.toFixed(1)}s`;}
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

function liveWpm(index: number, startedAt: number, now: number) {
  const elapsed = Math.max(now - startedAt, 1);
  if (elapsed < 1000) {return 0;}
  return Math.round(index / 5 / (elapsed / 60000));
}

export function TypingTest({
  title,
  content,
  onExit,
  active = true,
  shortcutsEnabled = true,
  onResultsChange,
}: TypingTestProps) {
  const chars = Array.from(content);
  const charsRef = useRef(chars);
  charsRef.current = chars;

  const [engine, setEngine] = useState<Engine>(createEngine);
  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [caretBox, setCaretBox] = useState<CaretBox | null>(null);
  const resultRef = useRef({ wpm: 0, accuracy: 100, elapsed: "0.0s" });
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const passageRef = useRef<HTMLDivElement>(null);
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
    setNow(Date.now());
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const { start, stop } = useInterval(() => setNow(Date.now()), 500);

  useEffect(() => {
    if (!active) {
      setFocused(false);
      return undefined;
    }
    const input = inputRef.current;
    input?.focus();
    const frame = requestAnimationFrame(() => {
      input?.focus();
      setFocused(document.activeElement === input);
    });
    return () => cancelAnimationFrame(frame);
  }, [content, active]);

  useEffect(() => {
    const running = engine.startedAt !== null && engine.finishedAt === null;
    if (running) {
      start();
      return () => stop();
    }
    stop();
    return undefined;
  }, [engine.startedAt, engine.finishedAt, start, stop]);

  useEffect(() => {
    if (engine.startedAt !== null && engine.finishedAt === null) {
      setNow(Date.now());
    }
  }, [engine.index, engine.mistakes, engine.startedAt, engine.finishedAt]);

  const finished = engine.finishedAt !== null && engine.startedAt !== null;
  const finishedRef = useRef(finished);
  finishedRef.current = finished;
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const restartRef = useRef(restart);
  restartRef.current = restart;

  useEffect(() => {
    onResultsChange?.(finished);
    return () => onResultsChange?.(false);
  }, [finished, onResultsChange]);

  useLayoutEffect(() => {
    const stage = stageRef.current;

    function measure() {
      const el = caretRef.current;
      if (!el || !stage || finished) {
        setCaretBox((current) => (current === null ? current : null));
        return;
      }
      const elRect = el.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const x = elRect.left - stageRect.left + stage.scrollLeft;
      const y = elRect.top - stageRect.top + stage.scrollTop;
      const h = elRect.height;
      setCaretBox((current) => {
        if (
          current &&
          Math.abs(current.x - x) < 0.5 &&
          Math.abs(current.y - y) < 0.5 &&
          Math.abs(current.h - h) < 0.5
        ) {
          return current;
        }
        return { x, y, h };
      });
    }

    measure();
    caretRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });

    if (!stage) {return undefined;}
    const observer = new ResizeObserver(() => measure());
    observer.observe(stage);
    if (passageRef.current) {observer.observe(passageRef.current);}
    return () => observer.disconnect();
  }, [engine.index, engine.mistake, finished, content]);

  useWindowEvent("keydown", (event) => {
    if (!active) {return;}
    if (event.repeat || event.isComposing) {return;}
    if (event.metaKey || event.ctrlKey || event.altKey) {return;}
    if (!isTypingTarget(event.target, inputRef.current)) {return;}

    const done = engine.finishedAt !== null;
    if (done) {
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

  useHotkeys(
    active && shortcutsEnabled
      ? [
          [
            "mod+Enter",
            (event) => {
              if (isForeignField(event.target, inputRef.current)) {return;}
              event.preventDefault();
              restartRef.current();
            },
          ],
          [
            "Escape",
            (event) => {
              if (finishedRef.current) {return;}
              if (isForeignField(event.target, inputRef.current)) {return;}
              if (
                event.target instanceof HTMLElement &&
                event.target.closest("[role='dialog']")
              ) {
                return;
              }
              event.preventDefault();
              onExitRef.current();
            },
          ],
        ]
      : [],
    [],
  );

  function onBeforeInput(event: FormEvent<HTMLInputElement>) {
    if (!active) {
      event.preventDefault();
      return;
    }
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

  let finalWpm = 0;
  let elapsedLabel = "0.0s";
  if (finished && engine.finishedAt !== null && engine.startedAt !== null) {
    const elapsed = Math.max(engine.finishedAt - engine.startedAt, 1);
    finalWpm = Math.round(chars.length / 5 / (elapsed / 60000));
    elapsedLabel = formatElapsed(elapsed);
  }
  const started = engine.startedAt !== null;
  const shownWpm =
    finished && engine.startedAt !== null
      ? finalWpm
      : engine.startedAt !== null
        ? liveWpm(engine.index, engine.startedAt, now)
        : 0;

  const accuracy =
    engine.keystrokes === 0
      ? 100
      : Math.round(
          ((engine.keystrokes - engine.mistakes) / engine.keystrokes) * 100,
        );
  if (finished) {
    resultRef.current = { wpm: finalWpm, accuracy, elapsed: elapsedLabel };
  }
  const result = resultRef.current;

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
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Tooltip label={<Shortcut keys={["Esc"]} />} openDelay={400}>
            <ActionIcon
              aria-label="Back to menu"
              variant="subtle"
              color="gray"
              onClick={onExit}
            >
              <IconArrowLeft size={18} />
            </ActionIcon>
          </Tooltip>
          <Text fw={600} truncate>
            {title}
          </Text>
        </Group>
        <Tooltip label={<Shortcut keys={["mod", "Enter"]} />} openDelay={400}>
          <ActionIcon
            aria-label="Restart"
            variant="subtle"
            color="cyan"
            onClick={restart}
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group
        className={classes.stats}
        data-live={started ? "true" : undefined}
        gap="xl"
        mb="md"
      >
        <Stack gap={2}>
          <Text className={classes.statValue} c={started ? "cyan" : "dimmed"}>
            {started ? shownWpm : "—"}
          </Text>
          <Text size="xs" c="dimmed">
            WPM
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text className={classes.statValue}>
            {started ? `${accuracy}%` : "—"}
          </Text>
          <Text size="xs" c="dimmed">
            Accuracy
          </Text>
        </Stack>
      </Group>

      <Box
        ref={stageRef}
        className={classes.stage}
        onMouseDown={(event) => {
          if (!active) {return;}
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
          onBlur={() => {
            requestAnimationFrame(() => {
              setFocused(document.activeElement === inputRef.current);
            });
          }}
          onBeforeInput={onBeforeInput}
          onChange={(event) => {
            event.currentTarget.value = "";
          }}
        />
        {caretBox && !finished ? (
          <span
            className={classes.caretMark}
            style={{
              height: Math.max(caretBox.h * 0.72, 1),
              transform: `translate(${caretBox.x}px, ${caretBox.y + caretBox.h * 0.14}px)`,
            }}
          />
        ) : null}
        <div
          ref={passageRef}
          className={[
            classes.passage,
            focused || finished ? "" : classes.blurred,
          ].filter(Boolean).join(" ")}
        >
          {lines.map((line, lineIndex) => (
            <div key={line[0]?.i ?? lineIndex} className={classes.line}>
              {line.map(({ ch, i }) => {
                const isCorrect = i < engine.index;
                const isCurrent = i === engine.index && !finished;
                const isMistake = isCurrent && engine.mistake;
                const className = [
                  classes.char,
                  ch === "\n" ? classes.newline : "",
                  isCorrect ? classes.correct : "",
                  isMistake ? classes.mistake : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <span
                    key={i}
                    ref={isCurrent ? caretRef : undefined}
                    className={className}
                    data-mistake={isMistake ? "true" : undefined}
                  >
                    {ch === "\n" ? "↵" : ch}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <Transition mounted={!focused && !finished} transition="fade" duration={160}>
          {(styles) => (
            <div className={classes.hint} style={styles}>
              Click to focus
            </div>
          )}
        </Transition>
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
        overlayProps={{ backgroundOpacity: 0.6, blur: 2 }}
      >
        <Stack gap="lg">
          <Group grow wrap="nowrap" gap="xs">
            <Stack gap={0} align="center">
              <Text fz={{ base: 32, sm: 48 }} fw={600} c="cyan" lh={1} className={classes.statValue}>
                {result.wpm}
              </Text>
              <Text size="xs" c="dimmed">
                WPM
              </Text>
            </Stack>
            <Stack gap={0} align="center">
              <Text fz={{ base: 32, sm: 48 }} fw={600} c="pink" lh={1} className={classes.statValue}>
                {result.accuracy}%
              </Text>
              <Text size="xs" c="dimmed">
                Accuracy
              </Text>
            </Stack>
            <Stack gap={0} align="center">
              <Text fz={{ base: 32, sm: 48 }} fw={600} lh={1} className={classes.statValue}>
                {result.elapsed}
              </Text>
              <Text size="xs" c="dimmed">
                Time
              </Text>
            </Stack>
          </Group>
          <Group grow>
            <Button
              onClick={restart}
              rightSection={<Shortcut keys={["mod", "Enter"]} />}
            >
              Restart
            </Button>
            <Button color="pink" onClick={onExit}>
              Back to menu
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
