import * as React from "react";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";
import {
  answerQuestions,
  getResume,
  type AnswerQuestionsDto,
} from "../../services/resumeService";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Dialog } from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge, Spinner } from "../ui/misc";

export interface QuestionsDialogProps {
  open: boolean;
  resumeId: string | null;
  handleClose: () => void;
}

const QuestionsDialog: React.FC<QuestionsDialogProps> = ({
  open,
  resumeId,
  handleClose,
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [questions, setQuestions] = React.useState<string>("");
  const [answers, setAnswers] = React.useState<
    Array<{ question: string; answer: string }>
  >([]);

  React.useEffect(() => {
    if (!open) {
      setQuestions("");
      setAnswers([]);
      return;
    }

    if (resumeId) {
      setIsLoading(true);
      getResume(resumeId)
        .then((resume) => {
          if (resume.answers && resume.answers.length > 0) {
            const cleanedAnswers = resume.answers.map((qa) => ({
              question: String(qa.question),
              answer: String(qa.answer),
            }));
            setAnswers(cleanedAnswers);
          }
        })
        .catch((error) => {
          console.error("Failed to load resume:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, resumeId]);

  const handleGenerate = async () => {
    if (!resumeId || !questions.trim()) {
      toast.error("Please enter at least one question");
      return;
    }

    setIsGenerating(true);
    try {
      const payload: AnswerQuestionsDto = {
        resumeId,
        questions: questions,
      };

      const response = await answerQuestions(payload);

      const newQaPairs = response.questions.map((question, index) => ({
        question,
        answer: response.answers[index] || "Unable to generate answer.",
      }));

      setAnswers((prevAnswers) => [...prevAnswers, ...newQaPairs]);
      setQuestions("");
      toast.success("Answers generated successfully!");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to generate answers";
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAnswer = (answer: string) => {
    navigator.clipboard.writeText(answer);
    toast.success("Answer copied to clipboard!");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
      title={answers.length > 0 ? "Questions & Answers" : "Answer Questions"}
      className="max-w-2xl"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating || isLoading}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerate}
            disabled={isGenerating || isLoading || !resumeId || !questions.trim()}
          >
            {isGenerating ? "Generating Answers..." : "Generate Answers"}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">
            Loading existing answers...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {answers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold">
                Existing Answers ({answers.length})
              </h3>
              <div className="space-y-3">
                {answers.map((qa, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Badge>Question {index + 1}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyAnswer(qa.answer)}
                          title="Copy answer"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm italic text-muted-foreground">
                        {qa.question}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{qa.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {answers.length > 0
                ? "Enter additional questions below. They will be added to your existing answers."
                : "Enter questions about the resume or job application. You can paste questions from any source - they will be automatically parsed and cleaned."}
            </p>
            <Label htmlFor="questions-input">Questions</Label>
            <Textarea
              id="questions-input"
              rows={8}
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder={
                "Paste one question per line (Enter). A trailing ? is optional.\n\nExample:\nWhy are you interested in this position\nWhat makes you a good fit for this role\nAre you authorized to work in the US"
              }
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Separate questions with Enter. They do not need to end with ?
            </p>
            {isGenerating ? (
              <div className="flex justify-center pt-2">
                <Spinner className="h-6 w-6" />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default QuestionsDialog;
