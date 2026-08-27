import { createTheme, type ThemeOptions } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

const brandPrimary = {
  main: "#ffba7f",
  light: "#ffd4b3",
  dark: "#cc945f",
  contrastText: "#000000",
};

const darkBrandPrimary = {
  main: "#ffba7f",
  light: "#ffe0c2",
  dark: "#e0a06a",
  contrastText: "#121212",
};

const lightSecondary = {
  main: "#545454",
  light: "#737373",
  dark: "#363636",
  contrastText: "#ffba7f",
};

const darkSecondary = {
  main: "#c5ccd6",
  light: "#e2e6ec",
  dark: "#9aa3b0",
  contrastText: "#0f1115",
};

const sharedThemeOptions: ThemeOptions = {
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        },
        "#root": {
          minHeight: "100vh",
          backgroundColor: theme.palette.background.default,
        },
      }),
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        colorSecondary: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                color: theme.palette.text.secondary,
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  color: theme.palette.text.primary,
                },
              }
            : {},
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                backgroundImage: "none",
                border: `1px solid ${theme.palette.divider}`,
              }
            : {},
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                backgroundImage: "none",
                border: `1px solid ${theme.palette.divider}`,
              }
            : {},
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                backgroundImage: "none",
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
              }
            : {},
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                "& .MuiTableCell-head": {
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  borderBottomColor: theme.palette.divider,
                },
              }
            : {},
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                borderBottomColor: theme.palette.divider,
                color: theme.palette.text.primary,
              }
            : {},
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
              }
            : {},
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: theme.palette.divider,
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: theme.palette.text.secondary,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: theme.palette.primary.main,
                },
              }
            : {},
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                color: theme.palette.text.secondary,
                "&.Mui-focused": {
                  color: theme.palette.primary.main,
                },
              }
            : {},
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                borderColor: theme.palette.divider,
              }
            : {},
        outlined: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                color: theme.palette.text.primary,
                borderColor: theme.palette.divider,
                backgroundColor: "rgba(255, 255, 255, 0.03)",
              }
            : {},
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "dark"
            ? {
                borderColor: theme.palette.divider,
              }
            : {},
      },
    },
    MuiTextField: {
      defaultProps: {
        slotProps: {
          inputLabel: {
            shrink: true,
          },
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...sharedThemeOptions,
  palette: {
    mode: "light",
    primary: brandPrimary,
    secondary: lightSecondary,
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
});

export const darkTheme = createTheme({
  ...sharedThemeOptions,
  palette: {
    mode: "dark",
    primary: darkBrandPrimary,
    secondary: darkSecondary,
    background: {
      default: "#0f1115",
      paper: "#171a21",
    },
    text: {
      primary: "#ECEFF4",
      secondary: "#A8B0BD",
      disabled: "rgba(168, 176, 189, 0.5)",
    },
    divider: "rgba(255, 255, 255, 0.12)",
    action: {
      active: "#ECEFF4",
      hover: "rgba(255, 255, 255, 0.08)",
      selected: "rgba(255, 186, 127, 0.16)",
      disabled: "rgba(168, 176, 189, 0.3)",
      disabledBackground: "rgba(255, 255, 255, 0.06)",
      focus: "rgba(255, 186, 127, 0.24)",
    },
  },
});

export const getTheme = (mode: ThemeMode) =>
  mode === "dark" ? darkTheme : lightTheme;
