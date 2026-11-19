import * as React from "react";
import type {
  CandidateProfileData,
  EducationEntry,
  SkillCategoryEntry,
} from "@resume-builder/shared";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  SKILL_CATEGORIES,
  resolveSkillCategory,
} from "../../constants/resumeSettings";

interface CandidateProfileSectionProps {
  value: CandidateProfileData;
  onChange: (profile: CandidateProfileData) => void;
  /** Top-level years cache (from company dates). Number only. */
  summaryExperienceYears: number | "";
  onSummaryExperienceYearsChange: (years: number | "") => void;
}

function parseSkillItems(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Keep a draft string so commas can be typed before the next skill name. */
const SkillItemsInput: React.FC<{
  items: string[];
  onCommit: (items: string[]) => void;
}> = ({ items, onCommit }) => {
  const [draft, setDraft] = React.useState(() => items.join(", "));
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) {
      setDraft(items.join(", "));
    }
  }, [items]);

  return (
    <Input
      value={draft}
      placeholder="TypeScript, React, Node.js"
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        focusedRef.current = false;
        const next = parseSkillItems(draft);
        setDraft(next.join(", "));
        onCommit(next);
      }}
    />
  );
};

export const CandidateProfileSection: React.FC<CandidateProfileSectionProps> = ({
  value,
  onChange,
  summaryExperienceYears,
  onSummaryExperienceYearsChange,
}) => {
  const updateEducation = (index: number, patch: Partial<EducationEntry>) => {
    const education = value.education.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry,
    );
    onChange({ ...value, education });
  };

  const updateSkillCategory = (
    index: number,
    patch: Partial<SkillCategoryEntry>,
  ) => {
    const baselineSkills = value.baselineSkills.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry,
    );
    onChange({ ...value, baselineSkills });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Professional title</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={value.professionalTitle}
            onChange={(e) =>
              onChange({ ...value, professionalTitle: e.target.value })
            }
            placeholder="Senior Software Engineer"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary experience length</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="summary-experience-years">
            Years of experience (number)
          </Label>
          <Input
            id="summary-experience-years"
            type="number"
            min={0}
            step={1}
            value={summaryExperienceYears}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onSummaryExperienceYearsChange("");
                return;
              }
              const n = Number(raw);
              if (Number.isFinite(n)) {
                onSummaryExperienceYearsChange(Math.max(0, Math.floor(n)));
              }
            }}
            placeholder="Auto-filled when you save companies"
          />
          <p className="text-sm text-muted-foreground">
            Cached from company experience when you save companies. You can
            override the number here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Education</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                education: [
                  ...value.education,
                  { degree: "", institution: "", date_range: "", location: "" },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {value.education.map((entry, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-2">
              <Input
                placeholder="Degree"
                value={entry.degree}
                onChange={(e) => updateEducation(index, { degree: e.target.value })}
              />
              <Input
                placeholder="Institution"
                value={entry.institution}
                onChange={(e) =>
                  updateEducation(index, { institution: e.target.value })
                }
              />
              <Input
                placeholder="Date range"
                value={entry.date_range}
                onChange={(e) =>
                  updateEducation(index, { date_range: e.target.value })
                }
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Location"
                  value={entry.location ?? ""}
                  onChange={(e) =>
                    updateEducation(index, { location: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onChange({
                      ...value,
                      education: value.education.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certifications (one per line)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={(value.certifications ?? [])
              .map((c) =>
                typeof c === "string"
                  ? c
                  : (c as { name?: string }).name ||
                    (c as { title?: string }).title ||
                    "",
              )
              .filter(Boolean)
              .join("\n")}
            onChange={(e) =>
              onChange({
                ...value,
                certifications: e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((name) => ({ name })),
              })
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Baseline skills</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                baselineSkills: [
                  ...value.baselineSkills,
                  { category: SKILL_CATEGORIES[0], items: [] },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" />
            Add category
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {value.baselineSkills.map((entry, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex gap-2">
                <select
                  className="h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm"
                  value={resolveSkillCategory(entry.category) ?? entry.category}
                  onChange={(e) =>
                    updateSkillCategory(index, { category: e.target.value })
                  }
                >
                  {SKILL_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onChange({
                      ...value,
                      baselineSkills: value.baselineSkills.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label>Items (comma-separated)</Label>
                <SkillItemsInput
                  items={entry.items}
                  onCommit={(items) => updateSkillCategory(index, { items })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
