"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  Switch,
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
  wrong: boolean[];
  locked: boolean;
};

type WordSpan = {
  start: number;
  end: number;
};

type Action =
  | { type: "char"; char: string }
  | { type: "backspace" }
  | { type: "backspaceWord" };

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
    wrong: [],
    locked: false,
  };
}

function isSeparator(ch: string) {
  return ch === " " || ch === "\n" || ch === "\t";
}

function wordSpans(chars: string[]): (WordSpan | null)[] {
  const spans: (WordSpan | null)[] = new Array(chars.length).fill(null);
  let i = 0;
  while (i < chars.length) {
    if (isSeparator(chars[i])) {
      i += 1;
      continue;
    }
    const start = i;
    while (i < chars.length && !isSeparator(chars[i])) {
      i += 1;
    }
    const span = { start, end: i - 1 };
    for (let j = start; j < i; j += 1) {
      spans[j] = span;
    }
  }
  return spans;
}

function wordSpanAt(chars: string[], index: number): WordSpan | null {
  if (index < 0 || index >= chars.length || isSeparator(chars[index])) {
    return null;
  }
  let start = index;
  while (start > 0 && !isSeparator(chars[start - 1])) {start -= 1;}
  let end = index;
  while (end + 1 < chars.length && !isSeparator(chars[end + 1])) {end += 1;}
  return { start, end };
}

function wordFails(wrong: boolean[], span: WordSpan) {
  let bad = 0;
  for (let i = span.start; i <= span.end; i += 1) {
    if (wrong[i]) {bad += 1;}
  }
  return bad * 5 > span.end - span.start + 1;
}

function backspaceLimit(chars: string[], state: Engine) {
  if (state.locked) {
    const span = wordSpanAt(chars, state.index - 1);
    return span ? span.start : state.index;
  }
  if (state.index >= chars.length || isSeparator(chars[state.index])) {
    return state.index;
  }
  const span = wordSpanAt(chars, state.index);
  return span ? span.start : state.index;
}

function rewindTo(state: Engine, index: number): Engine {
  if (index === state.index && !state.mistake && !state.locked) {return state;}
  const wrong = state.wrong.slice();
  for (let i = index; i < state.index; i += 1) {
    wrong[i] = false;
  }
  return { ...state, index, wrong, locked: false, mistake: false };
}

function reduce(
  state: Engine,
  action: Action,
  chars: string[],
  hideMode: boolean,
): Engine {
  if (state.finishedAt !== null) {return state;}

  if (action.type === "backspace" || action.type === "backspaceWord") {
    if (action.type === "backspace" && state.mistake) {
      return { ...state, mistake: false };
    }
    const limit = backspaceLimit(chars, state);
    const index =
      action.type === "backspaceWord" ? limit : Math.max(state.index - 1, limit);
    return rewindTo(state, index);
  }

  if (state.mistake || state.locked || state.index >= chars.length) {return state;}

  const now = Date.now();
  const startedAt = state.startedAt ?? now;
  const keystrokes = state.keystrokes + 1;
  const expected = chars[state.index];

  if (!hideMode || isSeparator(expected)) {
    if (action.char === expected) {
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

  const match = action.char === expected;
  const wrong = state.wrong.slice();
  wrong[state.index] = !match;
  const index = state.index + 1;
  const span = wordSpanAt(chars, state.index);
  const locked = span !== null && index === span.end + 1 && wordFails(wrong, span);

  return {
    ...state,
    index,
    wrong,
    locked,
    startedAt,
    keystrokes,
    mistakes: state.mistakes + (match ? 0 : 1),
    finishedAt: locked || index !== chars.length ? null : now,
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
  const [hideMode, setHideMode] = useState(false);
  const [focused, setFocused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [caretBox, setCaretBox] = useState<CaretBox | null>(null);
  const resultRef = useRef({ wpm: 0, accuracy: 100, elapsed: "0.0s" });
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const passageRef = useRef<HTMLDivElement>(null);
  const handledByKeydown = useRef(false);
  const hideModeRef = useRef(hideMode);
  hideModeRef.current = hideMode;
  const spans = useMemo(() => wordSpans(Array.from(content)), [content]);

  const applyChars = useCallback((input: string) => {
    const pieces = Array.from(input);
    setEngine((current) => {
      let next = current;
      for (const char of pieces) {
        next = reduce(next, { type: "char", char }, charsRef.current, hideModeRef.current);
      }
      return next;
    });
  }, []);

  const applyBackspace = useCallback(() => {
    setEngine((current) =>
      reduce(current, { type: "backspace" }, charsRef.current, hideModeRef.current),
    );
  }, []);

  const applyBackspaceWord = useCallback(() => {
    setEngine((current) =>
      reduce(current, { type: "backspaceWord" }, charsRef.current, hideModeRef.current),
    );
  }, []);

  const restart = useCallback(() => {
    setEngine(createEngine());
    setNow(Date.now());
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const toggleHide = useCallback((next: boolean) => {
    setHideMode(next);
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
  }, [engine.index, engine.mistake, engine.locked, finished, content]);

  useWindowEvent("keydown", (event) => {
    if (!active) {return;}
    if (event.repeat || event.isComposing) {return;}
    const deleteWord =
      event.key === "Backspace" &&
      event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey;
    if ((event.metaKey || event.ctrlKey || event.altKey) && !deleteWord) {return;}
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
      if (deleteWord) {applyBackspaceWord();}
      else {applyBackspace();}
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
    if (native.inputType === "deleteWordBackward") {
      applyBackspaceWord();
      return;
    }
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
        <Group gap="sm" wrap="nowrap">
          <Switch
            size="sm"
            label="Hide"
            checked={hideMode}
            onChange={(event) => toggleHide(event.currentTarget.checked)}
          />
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
          {lines.map((line, lineIndex) => {
            const showEndCaret =
              hideMode &&
              engine.locked &&
              engine.index === chars.length &&
              !finished &&
              lineIndex === lines.length - 1;
            const lineHasCaret =
              showEndCaret || line.some(({ i }) => i === engine.index && !finished);
            const lineHasVisible = line.some(({ i }) => {
              const span = spans[i];
              if (!hideMode) {return true;}
              if (span !== null) {return engine.index > span.end;}
              return i <= engine.index;
            });
            if (hideMode && !lineHasCaret && !lineHasVisible) {return null;}

            return (
            <div key={line[0]?.i ?? lineIndex} className={classes.line}>
              {line.map(({ ch, i }) => {
                const span = spans[i];
                const concealed =
                  hideMode && span !== null && engine.index <= span.end;
                const futureSeparator = hideMode && span === null && i > engine.index;
                const hidden = concealed || futureSeparator;
                const failed =
                  hideMode &&
                  engine.locked &&
                  span !== null &&
                  engine.index === span.end + 1 &&
                  engine.wrong[i] === true;
                const isCorrect = i < engine.index && !failed;
                const isCurrent = i === engine.index && !finished;
                const isMistake = failed || (isCurrent && engine.mistake);
                const className = [
                  classes.char,
                  ch === "\n" ? classes.newline : "",
                  isCorrect ? classes.correct : "",
                  isMistake ? classes.mistake : "",
                  hidden ? classes.concealed : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <span key={i}>
                    {isCurrent && hidden ? (
                      <span ref={caretRef} className={classes.caretAnchor} />
                    ) : null}
                    <span
                      ref={isCurrent && !hidden ? caretRef : undefined}
                      className={className}
                      data-mistake={isMistake ? "true" : undefined}
                      aria-hidden={hidden ? true : undefined}
                    >
                      {hidden ? "" : ch === "\n" ? "↵" : ch}
                    </span>
                  </span>
                );
              })}
              {showEndCaret ? (
                <span ref={caretRef} className={classes.caretAnchor} />
              ) : null}
            </div>
            );
          })}
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
        {hideMode
          ? "Tap the passage to open the keyboard. A word stays hidden until its last letter. More than 20% wrong must be backspaced and retyped."
          : "Tap the passage to open the keyboard. Correct mistakes with Backspace before continuing."}
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
