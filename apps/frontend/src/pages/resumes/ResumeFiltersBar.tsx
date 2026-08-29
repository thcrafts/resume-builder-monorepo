import { X } from "lucide-react";
import type { FilterResumeParams } from "../../services/resumeService";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

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
    <Card className="mb-4">
      <CardContent className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Filters</h2>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="filter-company">Company Name</Label>
            <Input
              id="filter-company"
              value={filters.companyName || ""}
              onChange={(e) => onFilterChange("companyName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-role">Role Type</Label>
            <Input
              id="filter-role"
              value={filters.roleType || ""}
              onChange={(e) => onFilterChange("roleType", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-start">Start Date</Label>
            <Input
              id="filter-start"
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => onFilterChange("startDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-end">End Date</Label>
            <Input
              id="filter-end"
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => onFilterChange("endDate", e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            onClick={onClearFilters}
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
