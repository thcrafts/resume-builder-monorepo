import { Button, Grid, Paper, TextField, Typography } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import type { FilterResumeParams } from "../../services/resumeService";

type ResumeFiltersBarProps = {
  filters: FilterResumeParams;
  onFilterChange: (field: keyof FilterResumeParams, value: string) => void;
  onClearFilters: () => void;
};

export function ResumeFiltersBar({
  filters,
  onFilterChange,
  onClearFilters,
}: ResumeFiltersBarProps) {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Filters
      </Typography>
      <Grid container spacing={2} alignItems="flex-end">
        <Grid size={{ xs: 12, sm: 6, md: "grow" }}>
          <TextField
            label="Company Name"
            value={filters.companyName || ""}
            onChange={(e) => onFilterChange("companyName", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: "grow" }}>
          <TextField
            label="Role Type"
            value={filters.roleType || ""}
            onChange={(e) => onFilterChange("roleType", e.target.value)}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: "grow" }}>
          <TextField
            label="Start Date"
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => onFilterChange("startDate", e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: "grow" }}>
          <TextField
            label="End Date"
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => onFilterChange("endDate", e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: "auto" }}>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
            color="secondary"
            size="small"
            sx={{ height: 40 }}
          >
            Clear
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}
