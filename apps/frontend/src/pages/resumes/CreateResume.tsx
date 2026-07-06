import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  generatePdfFromJson,
  generateResumeStream,
  type GenerateResumeDto,
} from "../../services/resumeService";
import { getProfile, type UserResponse } from "../../services/userService";
import { toast } from "react-toastify";
import { Link, useNavigate, useSearchParams } from "react-router";
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
import { resizableMultilineSx } from "../../constants/textFieldStyles";

const getResumePromptWarning = (
  profile: UserResponse | null,
): string | null => {
  if (!profile) return null;

  if (!profile.instructions?.trim()) {
    return "No resume prompt configured. Add your resume prompt in Profile settings before generating a resume.";
  }

  return null;
};

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

  const industry = "default";

  const apiKeyWarning = React.useMemo(
    () => getApiKeyWarning(profile),
    [profile],
  );

  const resumePromptWarning = React.useMemo(
    () => getResumePromptWarning(profile),
    [profile],
  );

  const isAiGenerateDisabled =
    isSubmitting || !!apiKeyWarning || !!resumePromptWarning;

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

  React.useEffect(() => {
    const duplicateDraft = loadDuplicateResumeDraft();

    getProfile()
      .then((loadedProfile) => {
        setProfile(loadedProfile);

        if (duplicateDraft) {
          clearDuplicateResumeDraft();
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
        // Profile warning is optional; submit validation still runs on the server.
      });
  }, [fromJsonParam, catalog]);

  React.useEffect(() => {
    if (catalog.providers.length === 0) {
      return;
    }

    const resolved = resolveModelSelectionInCatalog(aiModel, aiVersion, catalog);
    if (
      resolved.aiModel !== aiModel ||
      resolved.aiVersion !== aiVersion
    ) {
      setAiModel(resolved.aiModel);
      setAiVersion(resolved.aiVersion);
    }
  }, [catalog, aiModel, aiVersion]);

  const handleGenerateFromJsonChange = (
    _event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
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
      const defaults = resolveUserDefaultAi(profile, catalog);
      setAiModel(defaults.aiModel);
      setAiVersion(defaults.aiVersion);
    }

    setGenerateFromJson(checked);
    setSubmitError(null);
  };

  const handleAiModelChange = (model: string, version: string) => {
    setAiModel(model);
    setAiVersion(version);
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

    if (resumePromptWarning) {
      setSubmitError(resumePromptWarning);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: GenerateResumeDto = {
        companyName: data.companyName,
        roleType: data.roleType,
        jobDescription: data.jobDescription,
        industry,
        aiModel,
        aiVersion,
      };

      const response = await generateResumeStream(payload);

      if (response.resumeId) {
        toast.success("Resume generation started! Redirecting to resumes page...");
        navigate("/resumes");
        return;
      }
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
    } finally {
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
          // use default message
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
    <Paper sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">Generate Resume</Typography>
        <Button
          variant="contained"
          component={Link}
          to="/resumes"
          startIcon={<ArrowBackIcon />}
        >
          Resumes
        </Button>
      </Stack>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
        <Checkbox
          checked={generateFromJson}
          onChange={handleGenerateFromJsonChange}
          size="small"
          sx={{ p: 0.5 }}
        />
        <Typography variant="body1">Generate from JSON</Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {generateFromJson
          ? "Enter job details and paste resume JSON. A completed resume record will be saved and the PDF will use your profile template."
          : "Enter job details and paste the job description. A tailored resume will be generated in the background using your profile prompt and selected AI model."}
      </Typography>

      {!generateFromJson && resumePromptWarning && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" component={Link} to="/settings">
              Go to Settings
            </Button>
          }
        >
          {resumePromptWarning}
        </Alert>
      )}

      {!generateFromJson && apiKeyWarning && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" component={Link} to="/settings">
              Go to Settings
            </Button>
          }
        >
          {apiKeyWarning}
        </Alert>
      )}

      {submitError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setSubmitError(null)}
          action={
            submitError.toLowerCase().includes("profile") ? (
              <Button color="inherit" size="small" component={Link} to="/settings">
                Go to Settings
              </Button>
            ) : undefined
          }
        >
          {submitError}
        </Alert>
      )}

      {generateFromJson ? (
        <form onSubmit={jsonForm.handleSubmit(onJsonSubmit)}>
          <Stack spacing={3}>
            <AiModelSelector
              aiModel={aiModel}
              aiVersion={aiVersion}
              onChange={handleAiModelChange}
              disabled={isSubmitting}
            />

            <TextField
              {...jsonForm.register("companyName")}
              label="Company Name"
              fullWidth
              error={!!jsonForm.formState.errors.companyName}
              helperText={jsonForm.formState.errors.companyName?.message}
              required
              size="small"
              disabled={isSubmitting}
            />
            <TextField
              {...jsonForm.register("roleType")}
              label="Role Type"
              fullWidth
              error={!!jsonForm.formState.errors.roleType}
              helperText={jsonForm.formState.errors.roleType?.message}
              required
              size="small"
              disabled={isSubmitting}
            />
            <TextField
              {...jsonForm.register("jobDescription")}
              label="Job Description"
              fullWidth
              multiline
              rows={6}
              error={!!jsonForm.formState.errors.jobDescription}
              helperText={jsonForm.formState.errors.jobDescription?.message}
              required
              placeholder="Paste the job description here..."
              disabled={isSubmitting}
              size="small"
              sx={resizableMultilineSx}
            />

            <TextField
              {...jsonForm.register("jsonContent")}
              label="Resume JSON"
              fullWidth
              multiline
              rows={16}
              error={!!jsonForm.formState.errors.jsonContent}
              helperText={
                jsonForm.formState.errors.jsonContent?.message ??
                "Paste the full resume JSON object"
              }
              required
              placeholder='{"name": "...", "title": "...", ...}'
              disabled={isSubmitting}
              size="small"
              sx={resizableMultilineSx}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              fullWidth
            >
              {isSubmitting ? "Generating..." : "Generate"}
            </Button>
          </Stack>
        </form>
      ) : (
        <form onSubmit={aiForm.handleSubmit(onAiSubmit)}>
          <Stack spacing={3}>
            <AiModelSelector
              aiModel={aiModel}
              aiVersion={aiVersion}
              onChange={handleAiModelChange}
              disabled={isSubmitting}
            />

            <TextField
              {...aiForm.register("companyName")}
              label="Company Name"
              fullWidth
              error={!!aiForm.formState.errors.companyName}
              helperText={aiForm.formState.errors.companyName?.message}
              required
              size="small"
              disabled={isSubmitting}
            />
            <TextField
              {...aiForm.register("roleType")}
              label="Role Type"
              fullWidth
              error={!!aiForm.formState.errors.roleType}
              helperText={aiForm.formState.errors.roleType?.message}
              required
              size="small"
              disabled={isSubmitting}
            />
            <TextField
              {...aiForm.register("jobDescription")}
              label="Job Description"
              fullWidth
              multiline
              rows={10}
              error={!!aiForm.formState.errors.jobDescription}
              helperText={aiForm.formState.errors.jobDescription?.message}
              required
              placeholder="Paste the job description here..."
              disabled={isSubmitting}
              sx={resizableMultilineSx}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isAiGenerateDisabled}
              fullWidth
            >
              {isSubmitting ? "Generating..." : "Generate"}
            </Button>
          </Stack>
        </form>
      )}
    </Paper>
  );
};

export default CreateResume;
