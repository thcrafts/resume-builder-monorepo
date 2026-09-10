import * as React from "react";
import {
  Trash2,
  Plus,
  Download,
  Code,
  FileText,
  ClipboardCheck,
  MessageSquare,
  Eye,
  Copy,
  Pencil,
  FilePenLine,
  Settings,
  LogOut,
  Sun,
  Moon,
  RefreshCw,
} from "lucide-react";
import { Link, useNavigate, useOutletContext } from "react-router";
import {
  getResumes,
  getResume,
  deleteResume,
  updateResume,
  bulkDeleteResumes,
  downloadResume,
  generateCoverLetter,
  retryResume,
  type ResumeResponse,
  type FilterResumeParams,
} from "../../services/resumeService";
import { toast } from "react-toastify";
import moment from "moment";
import QuestionsDialog from "../../components/resumes/QuestionsDialog";
import AiVersionBadge from "../../components/resumes/AiVersionBadge";
import { useAuth } from "../../components/common/AuthContext";
import { useThemeMode } from "../../components/common/ThemeContext";
import { useAiModels } from "../../components/common/AiModelsContext";
import ModelProviderIcon from "../../components/common/ModelProviderIcon";
import {
  getProviderLabel,
  getRepresentativeModelIdForProvider,
  resolveModelSelectionInCatalog,
} from "../../constants/aiModels";
import { saveDuplicateResumeDraft } from "../../constants/duplicateResumeDraft";
import type { ProtectedLayoutContext } from "../../components/common/ProtectedLayout";
import { ResumeFiltersBar } from "./ResumeFiltersBar";
import { getAxiosErrorStatus } from "../../utils/authSession";
import { downloadPdfWithOverwrite } from "../../utils/downloadPdfWithOverwrite";
import { socket } from "./socket";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge, Checkbox, Spinner } from "../../components/ui/misc";
import { cn } from "../../lib/utils";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type GenerateProgressStep = "title" | "jd-requirements" | "summary" | "skills" | "experience";

type GenerateProgress = {
  step: GenerateProgressStep;
  index?: number;
  total?: number;
};

type StatusChipFilter = "completed" | "in_progress" | "failed";
type ChipFilter = StatusChipFilter | "manual" | `provider:${string}`;

function normalizeResumeProvider(aiModel?: string, aiVersion?: string): string {
  if (!aiModel) {
    if (aiVersion?.startsWith("anthropic/")) {
      return "anthropic";
    } else if (aiVersion?.startsWith("openai/")) {
      return "openai";
    }
    return "other";
  }
  if (aiModel === "claude") {
    return "anthropic";
  }
  if (aiModel === "openai") {
    return "openai";
  }

  return aiModel.split("/")[0] || aiModel;
}

const matchesChipFilter = (resume: ResumeResponse, filter: ChipFilter) => {
  switch (filter) {
    case "completed":
      return resume.status === "completed";
    case "in_progress":
      return resume.status === "in_progress";
    case "failed":
      return resume.status === "failed";
    case "manual":
      return resume.generationSource === "manual";
    default:
      if (filter.startsWith("provider:")) {
        const providerId = filter.slice("provider:".length);
        return (
          resume.generationSource !== "manual" &&
          normalizeResumeProvider(resume.aiModel, resume.aiVersion) ===
            providerId
        );
      }
      return true;
  }
};

function formatProgressLabel(progress?: GenerateProgress): string | null {
  if (!progress) return null;
  const stepLabel =
    progress.step === "jd-requirements"
      ? "JD requirements"
      : progress.step === "experience"
        ? "Experience"
        : progress.step.charAt(0).toUpperCase() + progress.step.slice(1);
  if (progress.step === "experience" && progress.index != null && progress.total != null) {
    return `${stepLabel} ${progress.index}/${progress.total}`;
  }
  return stepLabel;
}

const Resumes: React.FC = () => {
  const { catalog } = useAiModels();
  const [resumes, setResumes] = React.useState<ResumeResponse[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedResumes, setSelectedResumes] = React.useState<Set<string>>(
    new Set(),
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteResumeId, setDeleteResumeId] = React.useState<string | null>(
    null,
  );
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterResumeParams>(() => {
    const today = getLocalDateString();
    return {
      companyName: "",
      roleType: "",
      startDate: today,
      endDate: today,
    };
  });
  const [chipFilter, setChipFilter] = React.useState<ChipFilter | null>(null);
  const [generatingCoverLetterId, setGeneratingCoverLetterId] = React.useState<
    string | null
  >(null);
  const [retryingResumeId, setRetryingResumeId] = React.useState<string | null>(
    null,
  );
  const [editingResumeId, setEditingResumeId] = React.useState<string | null>(
    null,
  );
  const [metadataResume, setMetadataResume] =
    React.useState<ResumeResponse | null>(null);
  const [metadataCompanyName, setMetadataCompanyName] = React.useState("");
  const [metadataRoleType, setMetadataRoleType] = React.useState("");
  const [savingMetadata, setSavingMetadata] = React.useState(false);
  const [questionsResumeId, setQuestionsResumeId] = React.useState<
    string | null
  >(null);
  const [jobDescriptionDialogOpen, setJobDescriptionDialogOpen] =
    React.useState(false);
  const [selectedJobDescription, setSelectedJobDescription] =
    React.useState<string>("");
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = React.useState(false);
  const avatarMenuRef = React.useRef<HTMLDivElement>(null);
  const [generateProgressById, setGenerateProgressById] = React.useState<
    Record<string, GenerateProgress>
  >({});

  const navigate = useNavigate();
  const { logout } = useAuth();
  const { mode, setMode } = useThemeMode();
  const { user } = useOutletContext<ProtectedLayoutContext>();

  const userEmail = user.email;
  const userName = user.name || "";

  const avatarInitial = userEmail.charAt(0).toUpperCase();

  const displayName = userName.trim()
    ? userName.trim().split(" ")[0]
    : userEmail.split("@")[0] || "";

  React.useEffect(() => {
    if (!avatarMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
        setAvatarMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAvatarMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [avatarMenuOpen]);

  const handleSettingsClick = () => {
    setAvatarMenuOpen(false);
    navigate("/settings");
  };

  const handleLogoutClick = () => {
    setAvatarMenuOpen(false);
    setLogoutDialogOpen(true);
  };

  const handleThemeChange = (nextMode: "light" | "dark") => {
    setMode(nextMode);
    setAvatarMenuOpen(false);
  };

  const clearProgress = React.useCallback((id: string) => {
    setGenerateProgressById((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const loadResumes = React.useCallback(
    async (
      filterParams?: FilterResumeParams,
      options?: { silent?: boolean },
    ) => {
      if (!options?.silent) {
        setLoading(true);
      }
      try {
        const activeFilters: FilterResumeParams = {};
        if (filterParams?.companyName?.trim()) {
          activeFilters.companyName = filterParams.companyName.trim();
        }
        if (filterParams?.roleType?.trim()) {
          activeFilters.roleType = filterParams.roleType.trim();
        }
        if (filterParams?.startDate) {
          activeFilters.startDate = filterParams.startDate;
        }
        if (filterParams?.endDate) {
          activeFilters.endDate = filterParams.endDate;
        }

        const data = await getResumes(
          Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
        );
        setResumes(data);
      } catch (error: unknown) {
        if (getAxiosErrorStatus(error) === 401) {
          return;
        }
        if (!options?.silent) {
          toast.error("Failed to load resumes");
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const filtersRef = React.useRef(filters);
  const loadResumesRef = React.useRef(loadResumes);

  React.useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  React.useEffect(() => {
    loadResumesRef.current = loadResumes;
  }, [loadResumes]);

  React.useEffect(() => {
    const hasInProgress = resumes.some(
      (resume) => resume.status === "in_progress",
    );
    if (!hasInProgress) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadResumesRef.current(filtersRef.current, { silent: true });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [resumes]);

  React.useEffect(() => {
    type GenerateDonePayload = {
      id: string;
      message?: string;
    };

    type GenerateProgressPayload = {
      id: string;
      step: GenerateProgressStep;
      index?: number;
      total?: number;
    };

    function onGenerateDone({ id }: GenerateDonePayload) {
      clearProgress(String(id));
      let matchedCompany = "";
      let matched = false;
      setResumes((prev) => {
        matched = prev.some((resume) => String(resume._id) === String(id));
        if (!matched) {
          return prev;
        }

        return prev.map((resume) => {
          if (String(resume._id) !== String(id)) {
            return resume;
          }
          matchedCompany = resume.companyName;
          return { ...resume, status: "completed", failureMessage: undefined };
        });
      });

      if (!matched) {
        void loadResumesRef.current(filtersRef.current, { silent: true });
      }

      toast.success(
        matchedCompany
          ? `Resume ready: ${matchedCompany}`
          : "Resume generated successfully",
      );
    }

    function onGenerateFailed({ id, message }: GenerateDonePayload) {
      clearProgress(String(id));
      let matchedCompany = "";
      let matched = false;
      setResumes((prev) => {
        matched = prev.some((resume) => String(resume._id) === String(id));
        if (!matched) {
          return prev;
        }

        return prev.map((resume) => {
          if (String(resume._id) !== String(id)) {
            return resume;
          }
          matchedCompany = resume.companyName;
          return { ...resume, status: "failed", failureMessage: message };
        });
      });

      if (!matched) {
        void loadResumesRef.current(filtersRef.current, { silent: true });
      }

      toast.error(
        message
          ? matchedCompany
            ? `${matchedCompany}: ${message}`
            : message
          : matchedCompany
            ? `Resume failed: ${matchedCompany}`
            : "Resume generation failed",
      );
    }

    function onGenerateProgress({
      id,
      step,
      index,
      total,
    }: GenerateProgressPayload) {
      setGenerateProgressById((prev) => ({
        ...prev,
        [String(id)]: { step, index, total },
      }));
    }

    socket.on("generate:done", onGenerateDone);
    socket.on("generate:failed", onGenerateFailed);
    socket.on("generate:progress", onGenerateProgress);

    socket.on("connect_error", (e) => {
      toast.error(e?.message ?? "Socket connection error");
    });

    return () => {
      socket.off("generate:done", onGenerateDone);
      socket.off("generate:failed", onGenerateFailed);
      socket.off("generate:progress", onGenerateProgress);
      socket.off("connect_error");
    };
  }, [clearProgress]);

  React.useEffect(() => {
    const today = getLocalDateString();
    loadResumes({
      companyName: "",
      roleType: "",
      startDate: today,
      endDate: today,
    });
  }, [loadResumes]);

  const handleFilterChange = (
    field: keyof FilterResumeParams,
    value: string,
  ) => {
    const updatedFilters = {
      ...filters,
      [field]: value,
    };
    setFilters(updatedFilters);
    loadResumes(updatedFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters: FilterResumeParams = {
      companyName: "",
      roleType: "",
      startDate: "",
      endDate: "",
    };
    setFilters(emptyFilters);
    setChipFilter(null);
    setSelectedResumes(new Set());
    loadResumes(emptyFilters);
  };

  const handleChipFilterClick = (filter: ChipFilter) => {
    setChipFilter((current) => (current === filter ? null : filter));
    setSelectedResumes(new Set());
  };

  const resumeCounts = React.useMemo(() => {
    const completed = resumes.filter((r) => r.status === "completed").length;
    const inProgress = resumes.filter((r) => r.status === "in_progress").length;
    const failed = resumes.filter((r) => r.status === "failed").length;
    const manual = resumes.filter(
      (r) => r.generationSource === "manual",
    ).length;
    const providerCounts = new Map<string, number>();

    for (const resume of resumes) {
      if (resume.generationSource === "manual") {
        continue;
      }

      const providerId = normalizeResumeProvider(
        resume.aiModel,
        resume.aiVersion,
      );
      providerCounts.set(
        providerId,
        (providerCounts.get(providerId) ?? 0) + 1,
      );
    }

    return {
      total: resumes.length,
      completed,
      inProgress,
      failed,
      manual,
      providerCounts,
    };
  }, [resumes]);

  const providerFilters = React.useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();

    for (const provider of catalog?.providers ?? []) {
      if ((resumeCounts.providerCounts.get(provider.id) ?? 0) > 0) {
        ordered.push(provider.id);
        seen.add(provider.id);
      }
    }

    for (const providerId of resumeCounts.providerCounts.keys()) {
      if (!seen.has(providerId)) {
        ordered.push(providerId);
        seen.add(providerId);
      }
    }

    return ordered;
  }, [catalog, resumeCounts.providerCounts]);

  const filteredResumes = React.useMemo(() => {
    if (!chipFilter) {
      return resumes;
    }

    return resumes.filter((resume) => matchesChipFilter(resume, chipFilter));
  }, [resumes, chipFilter]);

  const filterChipClass = (filter: ChipFilter, selectedExtra?: string) =>
    cn(
      "cursor-pointer transition-colors",
      chipFilter === filter
        ? selectedExtra ?? "ring-2 ring-primary ring-offset-1 ring-offset-background"
        : "hover:bg-accent",
    );

  const handleDownloadResume = async (id: string) => {
    try {
      const response = await downloadResume(id);
      const pdfBlob = response.data;

      const result = await downloadPdfWithOverwrite(pdfBlob, {
        contentDisposition: response.headers["content-disposition"],
        fallbackFilename: "resume.pdf",
      });

      if (result.mode === "overwrite") {
        toast.success(
          `Resume downloaded (replaced existing ${result.filename})`,
        );
      } else if (result.mode === "created") {
        toast.success(
          `Resume saved as ${result.filename}. Next download with this name will replace it automatically.`,
        );
      } else {
        toast.success("Resume downloaded successfully!");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.info("Download cancelled");
        return;
      }
      toast.error("Failed to download resume");
    }
  };

  const handleGenerateCoverLetter = async (id: string) => {
    setGeneratingCoverLetterId(id);
    try {
      const response = await generateCoverLetter(id);
      const pdfBlob = response.data;

      const result = await downloadPdfWithOverwrite(pdfBlob, {
        contentDisposition: response.headers["content-disposition"],
        fallbackFilename: "Cover_Letter.pdf",
      });

      if (result.mode === "overwrite") {
        toast.success(
          `Cover letter downloaded (replaced existing ${result.filename})`,
        );
      } else if (result.mode === "created") {
        toast.success(
          `Cover letter saved as ${result.filename}. Next download with this name will replace it automatically.`,
        );
      } else {
        toast.success("Cover letter generated and downloaded successfully!");
      }
      setResumes((prev) =>
        prev.map((r) =>
          r._id === id
            ? { ...r, coverLetter: r.coverLetter || "generated" }
            : r,
        ),
      );
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.info("Download cancelled");
        return;
      }
      const err = error as {
        response?: { data?: Blob };
        message?: string;
      };
      let message = "Failed to generate cover letter";

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text) as { message?: string | string[] };
          if (parsed.message) {
            message = Array.isArray(parsed.message)
              ? parsed.message.join(", ")
              : parsed.message;
          }
        } catch {
          // use default message
        }
      } else if (err.message) {
        message = err.message;
      }

      toast.error(message);
    } finally {
      setGeneratingCoverLetterId(null);
    }
  };

  const handleRetryResume = async (id: string) => {
    setRetryingResumeId(id);
    try {
      await retryResume(id);
      clearProgress(id);
      setResumes((prev) =>
        prev.map((r) =>
          r._id === id
            ? { ...r, status: "in_progress", failureMessage: undefined }
            : r,
        ),
      );
      toast.success("Resume generation restarted");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const rawMessage = err.response?.data?.message ?? err.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : rawMessage || "Failed to retry resume generation";
      toast.error(message);
    } finally {
      setRetryingResumeId(null);
    }
  };

  const handleOpenMetadataEdit = (resume: ResumeResponse) => {
    setMetadataResume(resume);
    setMetadataCompanyName(resume.companyName);
    setMetadataRoleType(resume.roleType);
  };

  const handleCloseMetadataEdit = () => {
    if (savingMetadata) return;
    setMetadataResume(null);
    setMetadataCompanyName("");
    setMetadataRoleType("");
  };

  const handleSaveMetadata = async () => {
    if (!metadataResume) return;

    const companyName = metadataCompanyName.trim();
    const roleType = metadataRoleType.trim();
    if (!companyName || !roleType) {
      toast.warning("Company name and role are required");
      return;
    }

    setSavingMetadata(true);
    try {
      const updated = await updateResume(metadataResume._id, {
        companyName,
        roleType,
      });
      setResumes((prev) =>
        prev.map((resume) =>
          String(resume._id) === String(updated._id)
            ? {
                ...resume,
                companyName: updated.companyName,
                roleType: updated.roleType,
              }
            : resume,
        ),
      );
      toast.success("Company and role updated");
      setMetadataResume(null);
      setMetadataCompanyName("");
      setMetadataRoleType("");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const rawMessage = err.response?.data?.message ?? err.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : rawMessage || "Failed to update resume";
      toast.error(message);
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleEditResume = async (resume: ResumeResponse) => {
    if (resume.status !== "completed") {
      toast.warning("Only completed resumes can be edited");
      return;
    }

    setEditingResumeId(resume._id);
    try {
      let resumeJson = resume.resumeJson;

      if (!resumeJson) {
        const fullResume = await getResume(resume._id);
        resumeJson = fullResume.resumeJson;
      }

      if (!resumeJson || typeof resumeJson !== "object") {
        toast.error("Resume JSON is not available");
        return;
      }

      const normalized = resolveModelSelectionInCatalog(
        resume.aiModel,
        resume.aiVersion,
        catalog,
      );

      saveDuplicateResumeDraft({
        companyName: resume.companyName,
        roleType: resume.roleType,
        jobDescription: resume.jobDescription,
        aiModel: normalized.aiModel,
        aiVersion: normalized.aiVersion,
        jsonContent: JSON.stringify(resumeJson, null, 2),
      });

      navigate("/resumes/new?fromJson=1");
    } catch {
      toast.error("Failed to load resume for editing");
    } finally {
      setEditingResumeId(null);
    }
  };

  const handleSelectResume = (id: string) => {
    setSelectedResumes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedResumes.size === filteredResumes.length) {
      setSelectedResumes(new Set());
    } else {
      setSelectedResumes(new Set(filteredResumes.map((r) => r._id)));
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteResumeId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteResumeId) return;

    setDeleting(true);
    try {
      await deleteResume(deleteResumeId);
      toast.success("Resume deleted successfully!");
      await loadResumes(filters);
      setDeleteDialogOpen(false);
      setDeleteResumeId(null);
    } catch {
      toast.error("Failed to delete resume");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedResumes.size === 0) {
      toast.warning("Please select at least one resume to delete");
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedResumes.size === 0) return;

    setDeleting(true);
    try {
      const result = await bulkDeleteResumes({
        ids: Array.from(selectedResumes),
      });
      toast.success(
        `Successfully deleted ${result.deleted} resume(s)${
          result.failed.length > 0
            ? `. ${result.failed.length} failed to delete.`
            : ""
        }`,
      );
      setSelectedResumes(new Set());
      await loadResumes(filters);
      setBulkDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete resumes");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Job description copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleViewJobDescription = (jobDescription: string) => {
    setSelectedJobDescription(jobDescription);
    setJobDescriptionDialogOpen(true);
  };

  const allFilteredSelected =
    filteredResumes.length > 0 &&
    selectedResumes.size === filteredResumes.length;
  const someFilteredSelected =
    selectedResumes.size > 0 &&
    selectedResumes.size < filteredResumes.length;

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Resumes</h1>
        <div className="flex items-center gap-3">
          {resumes.length > 0 && selectedResumes.size > 0 && (
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleBulkDeleteClick}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedResumes.size})
            </Button>
          )}
          <Link to="/resumes/new">
            <Button type="button">
              <Plus className="h-4 w-4" />
              Generate
            </Button>
          </Link>
          <div className="relative" ref={avatarMenuRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent"
              onClick={() => setAvatarMenuOpen((open) => !open)}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {avatarInitial}
              </span>
              {displayName ? (
                <span className="text-sm font-medium">{displayName}</span>
              ) : null}
            </button>
            {avatarMenuOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-md border border-border bg-card py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={handleSettingsClick}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <div className="my-1 border-t border-border" />
                {mode === "dark" ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => handleThemeChange("light")}
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => handleThemeChange("dark")}
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </button>
                )}
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={handleLogoutClick}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ResumeFiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      <div className="mb-4 space-y-2">
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Loading resumes..."
            : chipFilter
              ? `${filteredResumes.length} of ${resumeCounts.total} resume${resumeCounts.total !== 1 ? "s" : ""}`
              : `${resumeCounts.total} resume${resumeCounts.total !== 1 ? "s" : ""}`}
        </p>
        {!loading && resumeCounts.total > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleChipFilterClick("completed")}
            >
              <Badge
                variant="success"
                className={filterChipClass("completed")}
              >
                {resumeCounts.completed} completed
              </Badge>
            </button>
            {resumeCounts.inProgress > 0 && (
              <button
                type="button"
                onClick={() => handleChipFilterClick("in_progress")}
              >
                <Badge
                  variant="default"
                  className={filterChipClass("in_progress")}
                >
                  {resumeCounts.inProgress} in progress
                </Badge>
              </button>
            )}
            {resumeCounts.failed > 0 && (
              <button
                type="button"
                onClick={() => handleChipFilterClick("failed")}
              >
                <Badge
                  variant="secondary"
                  className={cn(
                    filterChipClass("failed"),
                    "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {resumeCounts.failed} failed
                </Badge>
              </button>
            )}
            {providerFilters.map((providerId) => {
              const filter = `provider:${providerId}` as const;
              const selected = chipFilter === filter;
              return (
                <button
                  key={providerId}
                  type="button"
                  title={getProviderLabel(catalog, providerId)}
                  onClick={() => handleChipFilterClick(filter)}
                >
                  <Badge
                    variant={selected ? "default" : "outline"}
                    className={cn(
                      "gap-1.5",
                      filterChipClass(
                        filter,
                        "border-transparent bg-primary text-primary-foreground shadow-md",
                      ),
                    )}
                  >
                    <ModelProviderIcon
                      modelId={getRepresentativeModelIdForProvider(
                        catalog,
                        providerId,
                      )}
                    />
                    {resumeCounts.providerCounts.get(providerId) ?? 0}
                  </Badge>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleChipFilterClick("manual")}
            >
              <Badge
                variant={chipFilter === "manual" ? "secondary" : "outline"}
                className={cn(
                  "gap-1.5",
                  filterChipClass(
                    "manual",
                    "border-transparent bg-secondary text-secondary-foreground shadow-md",
                  ),
                )}
              >
                <Code className="h-3.5 w-3.5" />
                {resumeCounts.manual}
              </Badge>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : resumes.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-muted-foreground">
              No resumes found. Create your first resume!
            </p>
            <div className="flex justify-center">
              <Link to="/resumes/new">
                <Button type="button">
                  <Plus className="h-4 w-4" />
                  Generate
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : filteredResumes.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-muted-foreground">
              No resumes match the selected filter.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setChipFilter(null)}
            >
              Clear Filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table aria-label="resumes table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    checked={allFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someFilteredSelected;
                    }}
                    onChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="text-center">Company Name</TableHead>
                <TableHead className="text-center">Role Type</TableHead>
                <TableHead className="text-center">Job Description</TableHead>
                <TableHead className="text-center">AI Version</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Date</TableHead>
                <TableHead className="text-center" colSpan={6}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResumes.map((resume) => {
                const progressLabel = formatProgressLabel(
                  generateProgressById[resume._id],
                );
                return (
                  <TableRow key={resume._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedResumes.has(resume._id)}
                        onCheckedChange={() => handleSelectResume(resume._id)}
                        aria-label={`Select ${resume.companyName}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        className="rounded px-1 py-0.5 hover:bg-accent hover:text-accent-foreground"
                        title="Edit company name"
                        onClick={() => handleOpenMetadataEdit(resume)}
                      >
                        {resume.companyName}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        className="rounded px-1 py-0.5 hover:bg-accent hover:text-accent-foreground"
                        title="Edit role"
                        onClick={() => handleOpenMetadataEdit(resume)}
                      >
                        {resume.roleType}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      {resume.jobDescription ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleViewJobDescription(resume.jobDescription!)
                          }
                          title="View Job Description"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <AiVersionBadge
                          aiModel={resume.aiModel}
                          aiVersion={resume.aiVersion}
                          generationSource={resume.generationSource}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {resume.status === "in_progress" ? (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Spinner className="h-5 w-5" />
                          {progressLabel ? (
                            <Badge variant="outline" className="text-[10px]">
                              {progressLabel}
                            </Badge>
                          ) : null}
                        </div>
                      ) : resume.status === "failed" ? (
                        <div className="flex items-center justify-center gap-1">
                          <Badge
                            variant="secondary"
                            className="border-destructive/40 bg-destructive/10 text-destructive"
                            title={
                              resume.failureMessage || "Generation failed"
                            }
                          >
                            Failed
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRetryResume(resume._id)}
                            title="Retry generation"
                            disabled={retryingResumeId === resume._id}
                          >
                            {retryingResumeId === resume._id ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="success">Completed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {resume.createdAt
                        ? moment(resume.createdAt).format("MMM DD, YYYY")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadResume(resume._id)}
                        title="Download PDF"
                        disabled={resume.status !== "completed"}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          resume.coverLetter?.trim() && "text-success",
                        )}
                        onClick={() => handleGenerateCoverLetter(resume._id)}
                        title={
                          resume.generationSource === "manual"
                            ? "Cover letter not available for manual resumes"
                            : resume.coverLetter?.trim()
                              ? "Download cover letter (already generated)"
                              : "Generate cover letter"
                        }
                        disabled={
                          resume.status !== "completed" ||
                          resume.generationSource === "manual" ||
                          generatingCoverLetterId === resume._id
                        }
                      >
                        {generatingCoverLetterId === resume._id ? (
                          <Spinner className="h-4 w-4" />
                        ) : resume.coverLetter?.trim() ? (
                          <ClipboardCheck className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQuestionsResumeId(resume._id)}
                        title={
                          resume.generationSource === "manual"
                            ? "Answer questions not available for manual resumes"
                            : "Answer Questions"
                        }
                        disabled={
                          resume.status !== "completed" ||
                          resume.generationSource === "manual"
                        }
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenMetadataEdit(resume)}
                        title="Edit company & role"
                      >
                        <FilePenLine className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditResume(resume)}
                        title="Edit in Generate from JSON"
                        disabled={
                          resume.status !== "completed" ||
                          editingResumeId === resume._id
                        }
                      >
                        {editingResumeId === resume._id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(resume._id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={Boolean(metadataResume)}
        onOpenChange={(open) => {
          if (!open) handleCloseMetadataEdit();
        }}
        title="Edit company & role"
        description="Update how this resume appears in your list. PDF contents are unchanged."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseMetadataEdit}
              disabled={savingMetadata}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveMetadata()}
              disabled={savingMetadata}
            >
              {savingMetadata ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metadata-company">Company name</Label>
            <Input
              id="metadata-company"
              value={metadataCompanyName}
              onChange={(event) => setMetadataCompanyName(event.target.value)}
              disabled={savingMetadata}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metadata-role">Role</Label>
            <Input
              id="metadata-role"
              value={metadataRoleType}
              onChange={(event) => setMetadataRoleType(event.target.value)}
              disabled={savingMetadata}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Resume"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Are you sure you want to delete this resume? This action cannot be
          undone.
        </p>
      </Dialog>

      <Dialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Selected Resumes"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : `Delete ${selectedResumes.size}`}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Are you sure you want to delete {selectedResumes.size} resume(s)? This
          action cannot be undone.
        </p>
      </Dialog>

      <QuestionsDialog
        open={questionsResumeId !== null}
        resumeId={questionsResumeId}
        handleClose={() => setQuestionsResumeId(null)}
      />

      <Dialog
        open={jobDescriptionDialogOpen}
        onOpenChange={setJobDescriptionDialogOpen}
        title="Job Description"
        className="max-w-2xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCopyToClipboard(selectedJobDescription)}
            >
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setJobDescriptionDialogOpen(false)}
            >
              Close
            </Button>
          </>
        }
      >
        <p className="whitespace-pre-wrap break-words text-sm">
          {selectedJobDescription}
        </p>
      </Dialog>

      <Dialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="Confirm Logout"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                logout();
                setLogoutDialogOpen(false);
              }}
            >
              Logout
            </Button>
          </>
        }
      >
        <p className="text-sm">Are you sure you want to log out?</p>
      </Dialog>
    </div>
  );
};

export default Resumes;
