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

export const DEFAULT_COMPANY_EXPERIENCE_PROMPT = `You are an expert resume writer specializing in ATS-friendly, senior-level experience bullets.

The user message contains the job description and factual company context (company name, title, dates, product, mission).
Generate tailored achievements and role skills for this single company only.

RULES
- Keep company, title, date_range, and job_type factual — do not change them.
- Set responsibilities to an empty array in your mental model; output achievements only.
- Write 5–6 achievement bullets with action + scope + quantified numerical outcome in every bullet.
- Each bullet MUST mention the company's product AND mission context naturally.
- Align bullets to job-description skills and priorities using only supported facts.
- When Target Role Alignment is provided, reflect its languages, required skills, and experience themes in achievements and skills.
- Most recent role: skills MUST include every JD skill listed in the alignment block.
- Older roles: include a credible subset of JD skills supported by that company's product/mission.
- Prefer metrics from context; if none exist, use realistic measurable improvements tied to the described work.
- Avoid weak phrasing: "responsible for", "worked on", "helped with", "involved in".
- skills: technologies and capabilities supported by the role context and job description — do not invent unsupported tech.
- Return JSON only matching the provided schema.`;

export const DEFAULT_SUMMARY_PROMPT = `You are an expert resume writer. Write a concise, ATS-friendly professional summary.

Use the job description, final resume title, and company/product context provided.
When years of experience are provided, you MUST state them exactly as "N+ years of experience" using that number — do not estimate or change it.
The summary must reflect seniority, align with the job description, stay truthful, and avoid generic filler.
Return JSON only: { "summary": "..." }`;

export const DEFAULT_SKILLS_PROMPT = `You are an expert resume writer. Build an ATS-friendly TECHNICAL SKILLS (Core Technologies) section for the resume.

Use ALL sources provided in the user message:
1. Baseline skills — the candidate's core inventory
2. Role-proven skills — technologies already generated for each company experience entry (must appear)
3. Company context — products and missions that imply relevant stacks
4. Job description — prioritize matching keywords when supported by the sources above
5. When JD skills are listed separately, include ALL of them in Core Technologies (categorized appropriately)

RULES
- Include every JD skill when a JD skill list is provided
- Include supported skills from baseline and role-proven lists — do not invent unsupported tech
- When a per-category max is provided, each included category should have between 6 and that max skills (6 is the floor)
- Category sizes must look realistic and vary within that range (e.g. 6 in Testing, 9 in Backend). Do not pad every category to the max.
- Skip categories with no supported skills. Do not invent filler skills to reach a count.
- Prefer specific technologies, frameworks, platforms, tools, and methodologies over vague soft skills
- De-duplicate across categories; place each skill in the most specific applicable category
- Keep items concise (1–4 words each) and ATS-friendly
- Return JSON only matching the provided schema: { "skills": [{ "category": "Backend", "items": ["Node.js", "Express"] }] }
- category and each items entry must be plain strings (not objects)`;

export const DEFAULT_TITLE_MATCH_PROMPT = `You normalize resume titles against a job description.

Given the job description, the candidate's professional title, and their company role titles:
- Infer the best ATS-friendly root title for this application (2–5 words, market-standard).
- Compare similarity between the candidate's professional title and your inferred root title (0.0–1.0).

Return JSON only: { "rootTitle": "...", "similarity": 0.0 }`;

export const DEFAULT_JD_REQUIREMENTS_PROMPT = `You extract ATS alignment requirements from a job description for resume tailoring.

Read the full job description and return ONLY what is explicitly stated or clearly implied:
- languages: ALL programming languages required or preferred (e.g. TypeScript, Python, Java)
- requiredSkills: ALL frameworks, platforms, tools, databases, cloud services, and technical capabilities mentioned (not soft skills)
- experienceThemes: short phrases for technical focus areas (e.g. microservices, scalability, team leadership)
- experienceRequirements: years of experience, seniority, domain, and role expectations (e.g. "5+ years backend development", "experience leading teams")

Rules:
- Be exhaustive — capture every technology and tool mentioned in the JD.
- Be specific and concise (1–8 words per item).
- Do not invent technologies not mentioned in the JD.
- Prefer must-have / required items over nice-to-have when both exist.
- Return JSON only matching the provided schema.`;
