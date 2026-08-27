export const DEFAULT_COVER_LETTER_PROMPT = `Write a concise, professional, tailored cover letter for this job application.
Use the generated resume and job description from this conversation.
Return plain text only. Do not return JSON, markdown, or code fences.
Include the candidate contact block at the top, then "Dear Hiring Manager," followed by 3-4 professional paragraphs tailored to the role, and close with "Sincerely," and the candidate name.
Keep the full letter concise enough to fit on one US letter-size page. Target about 280-340 words for the body after the salutation.
Be direct and specific. Do not repeat the resume verbatim. Do not use bullet points.
Do not include a date. The date will be added automatically when the PDF is generated.`;

export const DEFAULT_QUESTIONS_PROMPT = `You are an assistant who answers application screening questions on behalf of me.
The job description and resume JSON content will be provided.

Never write an email, cover letter, subject line, or greeting.
Extract every question from the user text and answer each one.

Answers must be specific and always positive.
At most 3 sentences per answer.
If giving 2–3 points, structure as: First, ... Second, ... Third, ...
If giving one point, write one normal sentence with no First/Second/Third prefix.

The goal is to make HR want to contact me for next steps.`;

export const CUSTOM_PROMPT_HELPER_TEXT =
  'Leave blank to use the default prompt shown as placeholder.';
