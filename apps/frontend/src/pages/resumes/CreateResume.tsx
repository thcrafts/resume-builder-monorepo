import * as React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
import { validateCandidateProfile } from "@resume-builder/shared";
import {
  generatePdfFromJson,
  generateResumeStream,
  type GenerateResumeDto,
} from "../../services/resumeService";
import { getProfile, type UserResponse } from "../../services/userService";
import AiModelSelector from "../../components/resumes/AiModelSelector";
import { getApiKeyWarning } from "../../constants/profileWarnings";
import {
  resolveUserDefaultAi,
  resolveUserDefaultFromJsonAi,
  resolveModelSelectionInCatalog,
} from "../../constants/aiModels";
import { useAiModels } from "../../components/common/AiModelsContext";
import {
  clearDuplicateResumeDraft,
  loadDuplicateResumeDraft,
} from "../../constants/duplicateResumeDraft";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, Checkbox } from "../../components/ui/misc";

const aiGenerateSchema = yup
  .object({
    companyName: yup.string().required("Company name is required"),
    roleType: yup.string().required("Role type is required"),
    jobDescription: yup.string().required("Job description is required"),
  })
  .required();

const fromJsonSchema = yup
  .object({
    companyName: yup.string().required("Company name is required"),
    roleType: yup.string().required("Job title is required"),
    jobDescription: yup.string().required("Job description is required"),
    jsonContent: yup
      .string()
      .required("JSON content is required")
      .test("valid-json", "Invalid JSON format", (value) => {
        if (!value?.trim()) return false;
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      }),
  })
  .required();

type AiGenerateFormData = yup.InferType<typeof aiGenerateSchema>;
type FromJsonFormData = yup.InferType<typeof fromJsonSchema>;

const CreateResume: React.FC = () => {
  const { catalog } = useAiModels();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromJsonParam = searchParams.get("fromJson");
  const [generateFromJson, setGenerateFromJson] = React.useState(
    () => fromJsonParam === "1" || !!loadDuplicateResumeDraft(),
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [aiModel, setAiModel] = React.useState("anthropic");
  const [aiVersion, setAiVersion] = React.useState("anthropic/claude-sonnet-4.6");
  const [profile, setProfile] = React.useState<UserResponse | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const apiKeyWarning = React.useMemo(
    () => getApiKeyWarning(profile),
    [profile],
  );

  const profileValidation = React.useMemo(() => {
    if (!profile) return null;
    return validateCandidateProfile({
      name: profile.name,
      contacts: profile.contacts,
      candidateProfile: profile.candidateProfile,
      companies: profile.companies,
    });
  }, [profile]);

  const profileWarning =
    profileValidation && !profileValidation.valid
      ? `Complete your candidate profile before generating: ${profileValidation.errors.join("; ")}`
      : null;

  const isAiGenerateDisabled =
    isSubmitting || !!apiKeyWarning || !!profileWarning;

  const aiForm = useForm<AiGenerateFormData>({
    resolver: yupResolver(aiGenerateSchema),
    defaultValues: {
      companyName: "",
      roleType: "",
      jobDescription: "",
    },
  });

  const jsonForm = useForm<FromJsonFormData>({
    resolver: yupResolver(fromJsonSchema),
    defaultValues: {
      companyName: "",
      roleType: "",
      jobDescription: "",
      jsonContent: "",
    },
  });

  const duplicateDraftAppliedRef = React.useRef(false);

  React.useEffect(() => {
    const duplicateDraft = loadDuplicateResumeDraft();

    // Apply edit/duplicate draft immediately so Resume JSON is visible
    // without waiting on profile. Clear only after a successful apply.
    if (duplicateDraft && !duplicateDraftAppliedRef.current) {
      duplicateDraftAppliedRef.current = true;
      const resolved = resolveModelSelectionInCatalog(
        duplicateDraft.aiModel,
        duplicateDraft.aiVersion,
        catalog,
      );
      setGenerateFromJson(true);
      setAiModel(resolved.aiModel);
      setAiVersion(resolved.aiVersion);
      jsonForm.reset({
        companyName: duplicateDraft.companyName,
        roleType: duplicateDraft.roleType,
        jobDescription: duplicateDraft.jobDescription,
        jsonContent: duplicateDraft.jsonContent,
      });
      aiForm.reset({
        companyName: duplicateDraft.companyName,
        roleType: duplicateDraft.roleType,
        jobDescription: duplicateDraft.jobDescription,
      });
      clearDuplicateResumeDraft();
    }

    getProfile()
      .then((loadedProfile) => {
        setProfile(loadedProfile);

        if (duplicateDraftAppliedRef.current) {
          return;
        }

        const useFromJson =
          fromJsonParam === "1"
            ? true
            : fromJsonParam === "0"
              ? false
              : !!loadedProfile.defaultGenerateFromJson;

        setGenerateFromJson(useFromJson);

        const defaults = useFromJson
          ? resolveUserDefaultFromJsonAi(loadedProfile, catalog)
          : resolveUserDefaultAi(loadedProfile, catalog);
        setAiModel(defaults.aiModel);
        setAiVersion(defaults.aiVersion);
      })
      .catch(() => {
        // optional
      });
    // Forms are stable from useForm; intentionally omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromJsonParam, catalog]);

  const handleGenerateFromJsonChange = (checked: boolean) => {
    if (checked) {
      const aiValues = aiForm.getValues();
      jsonForm.reset({
        ...jsonForm.getValues(),
        companyName: aiValues.companyName,
        roleType: aiValues.roleType,
        jobDescription: aiValues.jobDescription,
      });
      const fromJsonDefaults = resolveUserDefaultFromJsonAi(profile, catalog);
      setAiModel(fromJsonDefaults.aiModel);
      setAiVersion(fromJsonDefaults.aiVersion);
    } else {
      const jsonValues = jsonForm.getValues();
      aiForm.reset({
        ...aiForm.getValues(),
        companyName: jsonValues.companyName,
        roleType: jsonValues.roleType,
        jobDescription: jsonValues.jobDescription,
      });
    }
    setGenerateFromJson(checked);
    setSubmitError(null);
  };

  const onAiSubmit = async (data: AiGenerateFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    if (apiKeyWarning) {
      setSubmitError(apiKeyWarning);
      setIsSubmitting(false);
      return;
    }

    if (profileWarning) {
      setSubmitError(profileWarning);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: GenerateResumeDto = {
        companyName: data.companyName,
        roleType: data.roleType,
        jobDescription: data.jobDescription,
        industry: "default",
      };

      const response = await generateResumeStream(payload);

      if (response.resumeId) {
        // Fire-and-forget: return to the list so another job can be started.
        toast.success(
          "Resume generation started — track progress on the Resumes page",
        );
        aiForm.reset({
          companyName: "",
          roleType: "",
          jobDescription: "",
        });
        navigate("/resumes");
        return;
      }

      setSubmitError("Failed to start resume generation");
      setIsSubmitting(false);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to generate resume";
      setSubmitError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const onJsonSubmit = async (data: FromJsonFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await generatePdfFromJson({
        companyName: data.companyName,
        roleType: data.roleType,
        jobDescription: data.jobDescription,
        jsonContent: data.jsonContent,
        aiModel,
        aiVersion,
      });
      const pdfBlob = response.data;

      const contentDisposition = response.headers["content-disposition"];
      let filename = "resume.pdf";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
        );
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1].replace(/['"]/g, "");
        }
      }

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Resume saved and PDF downloaded successfully!");
      navigate("/resumes");
    } catch (error: unknown) {
      const err = error as { response?: { data?: Blob }; message?: string };
      let message = "Failed to generate PDF from JSON";

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
          // use default
        }
      } else if (err.message) {
        message = err.message;
      }

      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Generate Resume</CardTitle>
        <Link
          to="/resumes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Resumes
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={generateFromJson}
            onCheckedChange={handleGenerateFromJsonChange}
          />
          Generate from JSON
        </label>

        {apiKeyWarning ? <Alert variant="warning">{apiKeyWarning}</Alert> : null}
        {profileWarning && !generateFromJson ? (
          <Alert variant="warning">
            {profileWarning}{" "}
            <Link to="/settings" className="underline">
              Open Settings
            </Link>
          </Alert>
        ) : null}

        <Alert variant="default">
          You can start multiple AI resume jobs. After you submit, you&apos;ll
          return to Resumes where each job shows its own progress.
        </Alert>

        {submitError ? <Alert variant="destructive">{submitError}</Alert> : null}

        {generateFromJson ? (
          <form
            className="space-y-4"
            onSubmit={jsonForm.handleSubmit(onJsonSubmit)}
          >
            <div className="space-y-2">
              <Label>Company name</Label>
              <Input {...jsonForm.register("companyName")} />
            </div>
            <div className="space-y-2">
              <Label>Job title</Label>
              <Input {...jsonForm.register("roleType")} />
            </div>
            <div className="space-y-2">
              <Label>Job description</Label>
              <Textarea rows={6} {...jsonForm.register("jobDescription")} />
            </div>
            <div className="space-y-2">
              <Label>Resume JSON</Label>
              <Textarea rows={12} {...jsonForm.register("jsonContent")} />
            </div>
            <AiModelSelector
              aiModel={aiModel}
              aiVersion={aiVersion}
              onChange={(model, version) => {
                setAiModel(model);
                setAiVersion(version);
              }}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Generating…" : "Generate from JSON"}
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={aiForm.handleSubmit(onAiSubmit)}>
            <div className="space-y-2">
              <Label>Company name</Label>
              <Input {...aiForm.register("companyName")} />
            </div>
            <div className="space-y-2">
              <Label>Role type</Label>
              <Input {...aiForm.register("roleType")} />
            </div>
            <div className="space-y-2">
              <Label>Job description</Label>
              <Textarea rows={10} {...aiForm.register("jobDescription")} />
            </div>
            <p className="text-xs text-muted-foreground">
              Uses chunked generation (title → JD requirements → summary → skills → experience).
              Multiple jobs can run at the same time — progress appears on the Resumes page.
            </p>
            <Button
              type="submit"
              disabled={isAiGenerateDisabled}
              className="w-full"
            >
              {isSubmitting ? "Starting…" : "Generate resume"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default CreateResume;
