import * as React from "react";
import { Link } from "react-router";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Key,
  Lock,
  PersonStanding,
  FileText,
  Edit,
  Briefcase,
  Moon,
  Sun,
} from "lucide-react";
import {
  validateCandidateProfile,
  DEFAULT_COMPANY_EXPERIENCE_PROMPT,
  DEFAULT_COVER_LETTER_PROMPT,
  DEFAULT_QUESTIONS_PROMPT,
  CUSTOM_PROMPT_HELPER_TEXT,
  type CandidateProfileData,
  type CompanyEntry,
  type ContactEntry,
} from "@resume-builder/shared";
import {
  getProfile,
  updateProfile,
  revealApiKeys,
  getOpenrouterUsage,
  type UserResponse,
  type UpdateProfileDto,
  type OpenRouterKeyUsage,
} from "../../services/userService";
import { downloadTemplatePreview } from "../../services/resumeService";
import AiModelSelector from "../../components/resumes/AiModelSelector";
import {
  resolveUserDefaultAi,
  resolveUserDefaultFromJsonAi,
} from "../../constants/aiModels";
import { useAiModels } from "../../components/common/AiModelsContext";
import { useThemeMode } from "../../components/common/ThemeContext";
import {
  ALERT_POSITIONS,
  useToastPosition,
  type AlertPosition,
} from "../../components/common/ToastPositionContext";
import {
  DEFAULT_RESUME_SETTINGS,
  SKILL_CATEGORIES,
  MIN_COMPANY_SKILL_COUNT,
  MAX_COMPANY_SKILL_COUNT,
  MAX_SKILLS_PER_CATEGORY,
  MIN_SKILLS_PER_CATEGORY,
  MAX_EXPERIENCE_BULLETS_PER_ROLE,
  getSkillCategoryLabel,
  resolveResumeSettings,
  resumeSettingsEqual,
  type ResumeSettings,
  type SkillCategory,
} from "../../constants/resumeSettings";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, Checkbox, Select, Spinner } from "../../components/ui/misc";
import { ContactsEditor } from "./ContactsEditor";
import { CompaniesEditor } from "./CompaniesEditor";
import { CandidateProfileSection } from "./CandidateProfileSection";

type ProfileSection =
  | "general"
  | "candidate"
  | "resume"
  | "prompts"
  | "api-keys"
  | "security";

const AUTO_SAVE_DELAY_MS = 800;

const emptyCandidateProfile = (): CandidateProfileData => ({
  professionalTitle: "",
  education: [],
  certifications: [],
  baselineSkills: [],
});

const Profile: React.FC = () => {
  const { catalog } = useAiModels();
  const { mode, setMode } = useThemeMode();
  const { position, setPosition } = useToastPosition();
  const skipAutoSaveRef = React.useRef(true);
  const [activeSection, setActiveSection] =
    React.useState<ProfileSection>("general");
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserResponse | null>(null);
  const [formData, setFormData] = React.useState({
    name: "",
    template: "template1",
    instructions: "",
    coverLetterPrompt: "",
    questionsPrompt: "",
    experiencePrompt: "",
    defaultAiModel: "anthropic",
    defaultAiVersion: "anthropic/claude-sonnet-4.6",
    defaultFromJsonAiModel: "openai",
    defaultFromJsonAiVersion: "openai/gpt-5.2",
    defaultGenerateFromJson: false,
    openrouterApiKey: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [contacts, setContacts] = React.useState<ContactEntry[]>([]);
  const [candidateProfile, setCandidateProfile] =
    React.useState<CandidateProfileData>(emptyCandidateProfile());
  const [companies, setCompanies] = React.useState<CompanyEntry[]>([]);
  const [resumeSettingsForm, setResumeSettingsForm] =
    React.useState<ResumeSettings>(DEFAULT_RESUME_SETTINGS);
  const [clearOpenrouterApiKey, setClearOpenrouterApiKey] = React.useState(false);
  const [verifyPassword, setVerifyPassword] = React.useState("");
  const [keysRevealed, setKeysRevealed] = React.useState(false);
  const [revealingKeys, setRevealingKeys] = React.useState(false);
  const [openrouterUsage, setOpenrouterUsage] =
    React.useState<OpenRouterKeyUsage | null>(null);
  const [loadingOpenrouterUsage, setLoadingOpenrouterUsage] =
    React.useState(false);
  const [securityError, setSecurityError] = React.useState<string | null>(null);
  const [changingPassword, setChangingPassword] = React.useState(false);

  const persistProfile = React.useCallback(async (updateData: UpdateProfileDto) => {
    const updated = await updateProfile(updateData);
    setUser(updated);
    return updated;
  }, []);

  const loadProfile = React.useCallback(async () => {
    try {
      skipAutoSaveRef.current = true;
      setLoading(true);
      const profile = await getProfile();
      const defaultAi = resolveUserDefaultAi(profile, catalog);
      const defaultFromJsonAi = resolveUserDefaultFromJsonAi(profile, catalog);
      setUser(profile);
      setResumeSettingsForm(resolveResumeSettings(profile.resumeSettings));
      setContacts(profile.contacts ?? []);
      setCandidateProfile(profile.candidateProfile ?? emptyCandidateProfile());
      setCompanies(profile.companies ?? []);
      setFormData({
        name: profile.name || "",
        template: profile.template || "template1",
        instructions: profile.instructions || "",
        coverLetterPrompt: profile.coverLetterPrompt || "",
        questionsPrompt: profile.questionsPrompt || "",
        experiencePrompt: profile.experiencePrompt || "",
        defaultAiModel: defaultAi.aiModel,
        defaultAiVersion: defaultAi.aiVersion,
        defaultFromJsonAiModel: defaultFromJsonAi.aiModel,
        defaultFromJsonAiVersion: defaultFromJsonAi.aiVersion,
        defaultGenerateFromJson: profile.defaultGenerateFromJson ?? false,
        openrouterApiKey: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
      window.setTimeout(() => {
        skipAutoSaveRef.current = false;
      }, 0);
    }
  }, [catalog]);

  const userId = user?._id;

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  React.useEffect(() => {
    if (skipAutoSaveRef.current || !userId) return;
    const timer = window.setTimeout(() => {
      void persistProfile({ name: formData.name }).catch(() =>
        toast.error("Failed to save name"),
      );
    }, AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [formData.name, persistProfile, userId]);

  React.useEffect(() => {
    if (skipAutoSaveRef.current || !userId) return;
    const timer = window.setTimeout(() => {
      void persistProfile({
        instructions: formData.instructions,
        coverLetterPrompt: formData.coverLetterPrompt,
        questionsPrompt: formData.questionsPrompt,
        experiencePrompt: formData.experiencePrompt,
      }).catch(() => toast.error("Failed to save prompts"));
    }, AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [
    formData.instructions,
    formData.coverLetterPrompt,
    formData.questionsPrompt,
    formData.experiencePrompt,
    persistProfile,
    userId,
  ]);

  // Contacts + candidate profile autosave (companies are saved manually).
  React.useEffect(() => {
    if (skipAutoSaveRef.current || !userId) return;
    const timer = window.setTimeout(() => {
      void persistProfile({
        contacts,
        candidateProfile,
      }).catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Failed to save candidate profile";
        toast.error(message);
      });
    }, AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [contacts, candidateProfile, persistProfile, userId]);

  React.useEffect(() => {
    if (skipAutoSaveRef.current || !user) return;
    const saved = resolveResumeSettings(user.resumeSettings);
    if (resumeSettingsEqual(resumeSettingsForm, saved)) return;
    const timer = window.setTimeout(() => {
      void persistProfile({ resumeSettings: resumeSettingsForm }).catch(() =>
        toast.error("Failed to save resume settings"),
      );
    }, AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [resumeSettingsForm, persistProfile, userId, user]);

  React.useEffect(() => {
    if (skipAutoSaveRef.current || !userId) return;
    if (!formData.openrouterApiKey && !clearOpenrouterApiKey) return;
    const timer = window.setTimeout(() => {
      void persistProfile({
        openrouterApiKey: clearOpenrouterApiKey
          ? undefined
          : formData.openrouterApiKey || undefined,
        clearOpenrouterApiKey: clearOpenrouterApiKey || undefined,
      })
        .then(() => {
          setClearOpenrouterApiKey(false);
          if (!keysRevealed) {
            setFormData((prev) => ({ ...prev, openrouterApiKey: "" }));
          }
          toast.success("API key saved");
        })
        .catch(() => toast.error("Failed to save API key"));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [
    formData.openrouterApiKey,
    clearOpenrouterApiKey,
    keysRevealed,
    persistProfile,
    userId,
  ]);

  const companiesDirty = React.useMemo(() => {
    const saved = JSON.stringify(user?.companies ?? []);
    const current = JSON.stringify(companies);
    return saved !== current;
  }, [companies, user?.companies]);

  const saveCompanies = React.useCallback(
    async (nextCompanies: CompanyEntry[]) => {
      const updated = await persistProfile({ companies: nextCompanies });
      setCompanies(updated.companies ?? nextCompanies);
      toast.success("Companies saved");
    },
    [persistProfile],
  );

  const profileCompleteness = validateCandidateProfile({
    name: formData.name,
    contacts,
    candidateProfile,
    companies,
  });

  const sections: Array<{
    id: ProfileSection;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: "general", label: "General", icon: <PersonStanding className="h-4 w-4" /> },
    { id: "candidate", label: "Candidate", icon: <Briefcase className="h-4 w-4" /> },
    { id: "resume", label: "Resume", icon: <FileText className="h-4 w-4" /> },
    { id: "prompts", label: "Prompts", icon: <Edit className="h-4 w-4" /> },
    { id: "api-keys", label: "API Keys", icon: <Key className="h-4 w-4" /> },
    { id: "security", label: "Security", icon: <Lock className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-64">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Settings</CardTitle>
            <Link
              to="/resumes"
              aria-label="Back to resumes"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                  activeSection === section.id
                    ? "bg-primary/20 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </CardContent>
        </Card>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        {!profileCompleteness.valid ? (
          <Alert variant="warning">
            Profile incomplete for generation: {profileCompleteness.errors.join("; ")}
          </Alert>
        ) : (
          <Alert variant="success">Candidate profile is ready for generation.</Alert>
        )}

        {activeSection === "general" ? (
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={mode === "light" ? "default" : "outline"}
                    onClick={() => setMode("light")}
                  >
                    <Sun className="h-4 w-4" /> Light
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "dark" ? "default" : "outline"}
                    onClick={() => setMode("dark")}
                  >
                    <Moon className="h-4 w-4" /> Dark
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Toast position</Label>
                <Select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as AlertPosition)}
                >
                  {ALERT_POSITIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default AI model (from-JSON / legacy)</Label>
                <AiModelSelector
                  aiModel={formData.defaultAiModel}
                  aiVersion={formData.defaultAiVersion}
                  onChange={(model, version) => {
                    setFormData((prev) => ({
                      ...prev,
                      defaultAiModel: model,
                      defaultAiVersion: version,
                    }));
                    void persistProfile({
                      defaultAiModel: model,
                      defaultAiVersion: version,
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Default from-JSON model</Label>
                <AiModelSelector
                  aiModel={formData.defaultFromJsonAiModel}
                  aiVersion={formData.defaultFromJsonAiVersion}
                  onChange={(model, version) => {
                    setFormData((prev) => ({
                      ...prev,
                      defaultFromJsonAiModel: model,
                      defaultFromJsonAiVersion: version,
                    }));
                    void persistProfile({
                      defaultFromJsonAiModel: model,
                      defaultFromJsonAiVersion: version,
                    });
                  }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.defaultGenerateFromJson}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      defaultGenerateFromJson: checked,
                    }));
                    void persistProfile({ defaultGenerateFromJson: checked });
                  }}
                />
                Default to generate from JSON
              </label>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "candidate" ? (
          <div className="space-y-4">
            <ContactsEditor value={contacts} onChange={setContacts} />
            <CandidateProfileSection
              value={candidateProfile}
              onChange={setCandidateProfile}
            />
            <CompaniesEditor
              value={companies}
              onChange={setCompanies}
              onSave={saveCompanies}
              dirty={companiesDirty}
            />
          </div>
        ) : null}

        {activeSection === "resume" ? (
          <Card>
            <CardHeader>
              <CardTitle>Resume settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={formData.template}
                  onChange={(e) => {
                    const template = e.target.value;
                    setFormData((prev) => ({ ...prev, template }));
                    void persistProfile({ template });
                  }}
                >
                  {[...Array(7)].map((_, index) => (
                    <option key={index} value={`template${index + 1}`}>
                      Template {index + 1}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await downloadTemplatePreview(
                        formData.template,
                      );
                      const url = window.URL.createObjectURL(response.data);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${formData.template}-preview.pdf`;
                      link.click();
                      window.URL.revokeObjectURL(url);
                    } catch {
                      toast.error("Failed to download template preview");
                    }
                  }}
                >
                  Download preview
                </Button>
              </div>
              {(
                [
                  ["showTitle", "Show title"],
                  ["showSubTitle", "Show subtitle"],
                  [
                    "showCompanySkills",
                    "Show company skills on PDF",
                  ],
                  [
                    "includeJdSkillsInCoreTechnologies",
                    "Include all JD skills in Core Technologies",
                  ],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={resumeSettingsForm[key]}
                    onCheckedChange={(checked) =>
                      setResumeSettingsForm((prev) => ({
                        ...prev,
                        [key]: checked,
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
              <div className="space-y-2">
                <Label>Skill categories</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SKILL_CATEGORIES.map((category) => {
                    const checked =
                      resumeSettingsForm.skillCategories.includes(category);
                    return (
                      <label
                        key={category}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            setResumeSettingsForm((prev) => {
                              const set = new Set(prev.skillCategories);
                              if (next) set.add(category);
                              else set.delete(category);
                              return {
                                ...prev,
                                skillCategories: SKILL_CATEGORIES.filter((c) =>
                                  set.has(c),
                                ) as SkillCategory[],
                              };
                            });
                          }}
                        />
                        {getSkillCategoryLabel(category)}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Achievements per role</Label>
                  <p className="text-xs text-muted-foreground">
                    Bullet count for each company role (5-6 recommended)
                  </p>
                  <Input
                    type="number"
                    min={5}
                    max={MAX_EXPERIENCE_BULLETS_PER_ROLE}
                    value={resumeSettingsForm.achievementsCount}
                    onChange={(e) =>
                      setResumeSettingsForm((prev) => ({
                        ...prev,
                        achievementsCount: Math.min(
                          MAX_EXPERIENCE_BULLETS_PER_ROLE,
                          Math.max(
                            5,
                            Number(e.target.value) ||
                              DEFAULT_RESUME_SETTINGS.achievementsCount,
                          ),
                        ),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Skills per category (max)</Label>
                  <p className="text-xs text-muted-foreground">
                    Each category: {MIN_SKILLS_PER_CATEGORY}–{MAX_SKILLS_PER_CATEGORY}{" "}
                    skills (default max 10; 0 = unlimited)
                  </p>
                  <Input
                    type="number"
                    min={0}
                    max={MAX_SKILLS_PER_CATEGORY}
                    value={resumeSettingsForm.skillsPerCategoryCount}
                    onChange={(e) =>
                      setResumeSettingsForm((prev) => ({
                        ...prev,
                        skillsPerCategoryCount:
                          Number(e.target.value) === 0
                            ? 0
                            : Math.min(
                                MAX_SKILLS_PER_CATEGORY,
                                Math.max(
                                  MIN_SKILLS_PER_CATEGORY,
                                  Number(e.target.value) ||
                                    DEFAULT_RESUME_SETTINGS.skillsPerCategoryCount,
                                ),
                              ),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Skills per company role</Label>
                  <p className="text-xs text-muted-foreground">
                    Experience entry skills ({MIN_COMPANY_SKILL_COUNT}-
                    {MAX_COMPANY_SKILL_COUNT})
                  </p>
                  <Input
                    type="number"
                    min={MIN_COMPANY_SKILL_COUNT}
                    max={MAX_COMPANY_SKILL_COUNT}
                    value={resumeSettingsForm.companySkillsCount}
                    onChange={(e) =>
                      setResumeSettingsForm((prev) => ({
                        ...prev,
                        companySkillsCount: Math.min(
                          MAX_COMPANY_SKILL_COUNT,
                          Math.max(
                            MIN_COMPANY_SKILL_COUNT,
                            Number(e.target.value) ||
                              DEFAULT_RESUME_SETTINGS.companySkillsCount,
                          ),
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "prompts" ? (
          <Card>
            <CardHeader>
              <CardTitle>Prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Summary / overlay instructions</Label>
                <Textarea
                  rows={6}
                  value={formData.instructions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  placeholder="Optional summary overlay instructions"
                />
              </div>
              <div className="space-y-2">
                <Label>Company experience prompt</Label>
                <Textarea
                  rows={8}
                  value={formData.experiencePrompt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      experiencePrompt: e.target.value,
                    }))
                  }
                  placeholder={DEFAULT_COMPANY_EXPERIENCE_PROMPT}
                />
                <p className="text-xs text-muted-foreground">
                  {CUSTOM_PROMPT_HELPER_TEXT}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Cover letter prompt</Label>
                <Textarea
                  rows={6}
                  value={formData.coverLetterPrompt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      coverLetterPrompt: e.target.value,
                    }))
                  }
                  placeholder={DEFAULT_COVER_LETTER_PROMPT}
                />
              </div>
              <div className="space-y-2">
                <Label>Questions prompt</Label>
                <Textarea
                  rows={6}
                  value={formData.questionsPrompt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      questionsPrompt: e.target.value,
                    }))
                  }
                  placeholder={DEFAULT_QUESTIONS_PROMPT}
                />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "api-keys" ? (
          <Card>
            <CardHeader>
              <CardTitle>OpenRouter API key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API key</Label>
                <Input
                  type="password"
                  value={formData.openrouterApiKey}
                  placeholder={
                    user?.hasOpenrouterApiKey ? "•••••••• (saved)" : "sk-or-..."
                  }
                  onChange={(e) => {
                    setClearOpenrouterApiKey(false);
                    setFormData((prev) => ({
                      ...prev,
                      openrouterApiKey: e.target.value,
                    }));
                  }}
                  className={
                    user?.hasOpenrouterApiKey && !formData.openrouterApiKey
                      ? "border-success"
                      : undefined
                  }
                />
                {user?.hasOpenrouterApiKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setClearOpenrouterApiKey(true);
                      setFormData((prev) => ({ ...prev, openrouterApiKey: "" }));
                    }}
                  >
                    Clear saved key
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Verify password to reveal</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={verifyPassword}
                    onChange={(e) => setVerifyPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    disabled={revealingKeys || !verifyPassword}
                    onClick={async () => {
                      setRevealingKeys(true);
                      try {
                        const revealed = await revealApiKeys(verifyPassword);
                        setKeysRevealed(true);
                        setFormData((prev) => ({
                          ...prev,
                          openrouterApiKey: revealed.openrouterApiKey || "",
                        }));
                      } catch {
                        toast.error("Failed to reveal API key");
                      } finally {
                        setRevealingKeys(false);
                      }
                    }}
                  >
                    Reveal
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={loadingOpenrouterUsage}
                onClick={async () => {
                  setLoadingOpenrouterUsage(true);
                  try {
                    setOpenrouterUsage(await getOpenrouterUsage());
                  } catch {
                    toast.error("Failed to load usage");
                  } finally {
                    setLoadingOpenrouterUsage(false);
                  }
                }}
              >
                {loadingOpenrouterUsage ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Refreshing...
                  </>
                ) : (
                  "Refresh usage"
                )}
              </Button>
              {openrouterUsage ? (
                <p className="text-sm text-muted-foreground">
                  Usage: {openrouterUsage.usage} /{" "}
                  {openrouterUsage.limit ?? "∞"} (remaining{" "}
                  {openrouterUsage.limitRemaining ?? "∞"})
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {activeSection === "security" ? (
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["currentPassword", "Current password"],
                  ["newPassword", "New password"],
                  ["confirmPassword", "Confirm password"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type="password"
                    value={formData[field]}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              {securityError ? (
                <Alert variant="destructive">{securityError}</Alert>
              ) : null}
              <Button
                type="button"
                disabled={changingPassword}
                onClick={async () => {
                  setSecurityError(null);
                  if (formData.newPassword !== formData.confirmPassword) {
                    setSecurityError("Passwords do not match");
                    return;
                  }
                  setChangingPassword(true);
                  try {
                    await persistProfile({
                      currentPassword: formData.currentPassword,
                      newPassword: formData.newPassword,
                    });
                    setFormData((prev) => ({
                      ...prev,
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    }));
                    toast.success("Password updated");
                  } catch (error: unknown) {
                    const message =
                      (error as { response?: { data?: { message?: string } } })
                        ?.response?.data?.message || "Failed to update password";
                    setSecurityError(message);
                  } finally {
                    setChangingPassword(false);
                  }
                }}
              >
                Update password
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default Profile;
