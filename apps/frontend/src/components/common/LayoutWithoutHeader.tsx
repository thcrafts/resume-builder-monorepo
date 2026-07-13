import { Box } from "@mui/material";
import * as React from "react";
import { Outlet, useOutletContext } from "react-router";

const LayoutWithoutHeader: React.FC = () => {
  const context = useOutletContext();

  return (
    <Box
      sx={{
        bgcolor: (theme) => theme.palette.background.default,
        color: (theme) => theme.palette.text.primary,
        padding: 2,
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <Outlet context={context} />
    </Box>
  );
};

export default LayoutWithoutHeader;
