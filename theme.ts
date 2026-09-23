import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";

const neonCyan: MantineColorsTuple = [
  "#e6feff",
  "#c2fbff",
  "#8ef7ff",
  "#4df3ff",
  "#00f0ff",
  "#00d6e6",
  "#00b4c4",
  "#008c99",
  "#006973",
  "#00484f",
];

const hotPink: MantineColorsTuple = [
  "#ffe5ec",
  "#ffb3c4",
  "#ff809d",
  "#ff4d76",
  "#ff1a4f",
  "#ff003c",
  "#db0033",
  "#b00029",
  "#85001f",
  "#5c0015",
];

const neonPurple: MantineColorsTuple = [
  "#f6e8ff",
  "#e4c2ff",
  "#d199ff",
  "#be70ff",
  "#b026ff",
  "#9a00ee",
  "#7c00c2",
  "#610099",
  "#470070",
  "#2e004a",
];

export const theme = createTheme({
  primaryColor: "cyan",
  primaryShade: { light: 4, dark: 4 },
  defaultRadius: "sm",
  white: "#e8e8f0",
  black: "#0f0f13",
  fontFamily: "system-ui, sans-serif",
  fontFamilyMonospace:
    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  headings: { fontFamily: "system-ui, sans-serif", fontWeight: "600" },
  colors: {
    cyan: neonCyan,
    pink: hotPink,
    purple: neonPurple,
  },
  other: {
    bg: "#0f0f13",
    cyan: "#00f0ff",
    pink: "#ff003c",
    purple: "#b026ff",
  },
  components: {
    Button: {
      defaultProps: {
        variant: "outline",
        color: "cyan",
      },
    },
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {},
  dark: {
    "--mantine-color-body": "#0f0f13",
    "--mantine-color-text": "#e8e8f0",
    "--mantine-color-dimmed": "#8d8da3",
    "--mantine-color-default": "#0f0f13",
    "--mantine-color-default-hover": "#17171f",
    "--mantine-color-default-border": "#2a2a38",
    "--mantine-color-error": "#ff003c",
  },
});
