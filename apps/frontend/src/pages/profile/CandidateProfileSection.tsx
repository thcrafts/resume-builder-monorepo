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
}

export const CandidateProfileSection: React.FC<CandidateProfileSectionProps> = ({
  value,
  onChange,
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
                <Input
                  value={entry.items.join(", ")}
                  onChange={(e) =>
                    updateSkillCategory(index, {
                      items: e.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
