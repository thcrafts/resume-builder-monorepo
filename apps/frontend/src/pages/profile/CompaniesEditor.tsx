import * as React from "react";
import {
  validateCompanyFieldsForSave,
  type CompanyEntry,
} from "@resume-builder/shared";
import { Plus, Trash2, Save, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, Badge } from "../../components/ui/misc";

/** List index 0 = most recent. Higher sortOrder = more recent. */
function withSyncedSortOrder(companies: CompanyEntry[]): CompanyEntry[] {
  const total = companies.length;
  return companies.map((company, index) => ({
    ...company,
    sortOrder: total - 1 - index,
  }));
}

function newCompany(): CompanyEntry {
  return {
    id: crypto.randomUUID(),
    company: "",
    title: "",
    date_range: "",
    job_type: "Full-time",
    location: "",
    product: "",
    mission: "",
    context: "",
    sortOrder: 0,
  };
}

interface CompaniesEditorProps {
  value: CompanyEntry[];
  onChange: (companies: CompanyEntry[]) => void;
  onSave: (companies: CompanyEntry[]) => Promise<void>;
  dirty?: boolean;
}

export const CompaniesEditor: React.FC<CompaniesEditorProps> = ({
  value,
  onChange,
  onSave,
  dirty = false,
}) => {
  const [saving, setSaving] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const setCompanies = (next: CompanyEntry[]) => {
    setLocalError(null);
    onChange(withSyncedSortOrder(next));
  };

  // Display most recent first even if saved sortOrder is stale.
  const displayList = React.useMemo(
    () =>
      [...value].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0)),
    [value],
  );

  const updateAt = (index: number, patch: Partial<CompanyEntry>) => {
    setCompanies(
      displayList.map((company, i) =>
        i === index ? { ...company, ...patch } : company,
      ),
    );
  };

  const removeAt = (index: number) => {
    setCompanies(displayList.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= displayList.length) return;
    const next = [...displayList];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setCompanies(next);
  };

  const handleSave = async () => {
    const ordered = withSyncedSortOrder(displayList);
    const validation = validateCompanyFieldsForSave(ordered);
    if (!validation.valid) {
      setLocalError(validation.errors.join("; "));
      return;
    }

    setSaving(true);
    setLocalError(null);
    try {
      await onSave(ordered);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to save companies";
      setLocalError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Companies</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Order = resume order. Top company is most recent. Use arrows to reorder,
            then Save. Product and mission are required.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              // Prepend = most recent
              setCompanies([newCompany(), ...displayList]);
            }}
          >
            <Plus className="h-4 w-4" />
            Add company
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || !dirty}
            onClick={() => void handleSave()}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save companies"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {localError ? <Alert variant="destructive">{localError}</Alert> : null}
        {dirty && !localError ? (
          <Alert variant="warning">You have unsaved company changes.</Alert>
        ) : null}
        {displayList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No companies yet. Add one (it becomes your most recent role), fill
            required fields, then save.
          </p>
        ) : null}
        {displayList.map((company, index) => {
          const isMostRecent = index === 0;
          return (
            <div
              key={company.id}
              className="space-y-3 rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    {isMostRecent ? "Most recent role" : `Earlier role ${index}`}
                  </p>
                  {isMostRecent ? <Badge variant="success">Top of resume</Badge> : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move up (more recent)"
                    title="Move up (more recent)"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === displayList.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move down (older)"
                    title="Move down (older)"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAt(index)}
                    aria-label="Remove company"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Company name</Label>
                  <Input
                    value={company.company}
                    onChange={(e) => updateAt(index, { company: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    value={company.title}
                    onChange={(e) => updateAt(index, { title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Date range</Label>
                  <Input
                    value={company.date_range}
                    onChange={(e) =>
                      updateAt(index, { date_range: e.target.value })
                    }
                    placeholder="02/2022 – Present"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Job type</Label>
                  <Input
                    value={company.job_type}
                    onChange={(e) =>
                      updateAt(index, { job_type: e.target.value })
                    }
                    placeholder="Full-time / Contract"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Location</Label>
                  <Input
                    value={company.location ?? ""}
                    onChange={(e) =>
                      updateAt(index, { location: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Product *</Label>
                  <Input
                    value={company.product}
                    onChange={(e) => updateAt(index, { product: e.target.value })}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Mission *</Label>
                  <Textarea
                    value={company.mission}
                    onChange={(e) =>
                      updateAt(index, { mission: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Extra context</Label>
                  <Textarea
                    value={company.context ?? ""}
                    onChange={(e) =>
                      updateAt(index, { context: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
