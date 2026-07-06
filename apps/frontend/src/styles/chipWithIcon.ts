/** Left spacing for icons inside MUI Chips (table badges, filter counts, etc.). */
export const chipWithIconSx = {
  pl: "6px",
  "& .MuiChip-icon": {
    marginLeft: 0,
    marginRight: "6px",
  },
  "& .MuiChip-label": {
    pr: 0.75,
  },
} as const;
