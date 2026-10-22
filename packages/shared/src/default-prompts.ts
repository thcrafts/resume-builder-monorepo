export const DEFAULT_COVER_LETTER_PROMPT = `Write a concise, professional, tailored cover letter for this job application.
Use the generated resume and job description from this conversation.
Return plain text only. Do not return JSON, markdown, or code fences.
Include the candidate contact block at the top, then "Dear Hiring Manager," followed by 3-4 professional paragraphs tailored to the role, and close with "Sincerely," and the candidate name.
Keep the full letter concise enough to fit on one US letter-size page. Target about 280-340 words for the body after the salutation.
Be direct and specific. Do not repeat the resume verbatim. Do not use bullet points.
Do not include a date. The date will be added automatically when the PDF is generated.`;

export const DEFAULT_QUESTIONS_PROMPT = `Answer application screening questions as me, a real job applicant.

Write in first person. Use natural, everyday American English — short spoken answers, not an essay.

Keep each answer to 1–2 sentences. Never more than 3.
Be specific and positive. Use facts from my resume and the job description.
Never write an email, cover letter, subject line, or greeting.
Never use First/Second/Third, bullet lists, or buzzword stuffing.
Extract every question from the user text and answer each one.
Questions are often one per line (Enter-separated) and may not end with "?". Treat each non-empty line or numbered item as its own question.`;

/** Always appended after the default or custom questions prompt. */
export const QUESTIONS_VOICE_OVERLAY = `VOICE (MANDATORY — applies even with a custom prompt)
- Speak as the applicant in first person.
- Natural American English. Short spoken answers, not essays.
- 1–2 sentences per answer. Hard cap: 3.
- No First/Second/Third. No bullets. No cover letter or email.
- Stay specific and truthful to the resume and job description.
- One answer per question. Line breaks or numbering split questions; a trailing "?" is optional.`;

export const CUSTOM_PROMPT_HELPER_TEXT =
  'Leave blank to use the default prompt shown as placeholder.';

export const DEFAULT_COMPANY_EXPERIENCE_PROMPT = `You are an expert resume writer specializing in ATS-friendly, credible, senior-level experience bullets customized for ONE employer.

The user message contains the job description alignment, the official job title, and factual company context (company name, title, dates, job type, product, mission, extra context).

INSTRUCTION PRIORITY (when rules conflict)
1. Preserve employer identity, official job title, dates, location, and career timeline. Never rewrite the job title to the JD title.
2. Keep this company's real work / main product as the bullet content. Customize how that work is described toward the JD. Do not replace it with a JD skill list.
3. Keep recent modern frameworks, languages, and key technologies from the candidate skill set in those product bullets.
4. ADD the assigned mandatory JD skills into that existing product work, together with modern skillsets. Most recent role: also include the mandatory JD experience (domain, seniority, themes) with realistic evidence. Older roles: weaker match with fewer skills.
5. No gap-filling and no weak evidence. Do not invent related stacks or "exposure" claims.

Generate tailored achievement bullets for this single company only. Do NOT generate a skills list — skills are extracted from these bullets in a later step.

HOW TO WRITE BULLETS
- Keep company, title, date_range, and job_type factual. Never change or infer a different occupation title.
- Set responsibilities to an empty array; output achievements only.
- Write concise achievement bullets about THIS company's product, mission, domain, and extra context.
- NEVER use the company name in any achievement bullet.
- Do not rewrite the role around the JD. Do not delete the real work and paste JD keywords.
- Keep recent modern frameworks and key technologies from the provided candidate skill set in the product story.
- ADD the assigned mandatory JD skills by naming them in existing product work, alongside those modern skillsets. Do not add preferred, implied, or gap-fill technologies.
- Most recent role: the bullets must contain the mandatory JD skills and the mandatory JD experience (years/seniority/domain). Add them realistically onto this product with modern skillsets.
- Evidence must be strong (built, implemented, owned, shipped). Never use weak phrasing: "familiar with", "exposed to", "knowledge of", "helped with", "worked on", "involved in", "responsible for".
- If a listed skill cannot be stated with strong evidence for this employer, do not force a weak substitute stack.
- Each bullet should focus on a distinct accomplishment — not a comma-separated skill dump.
- Prefer: strong action + what was built/improved on this product + modern/key stack + added mandatory skill where it fits + impact.
- Numerical improvements (%, ms, $, users, x, weeks) are REQUIRED in exactly 1–2 bullets total. All other bullets must have NO numeric improvement metrics.
- When company context provides verified metrics, use them. When none exist, use the Metric targets provided for the role (they vary per role and resume); do not default to the same common values like 30–40%.
- Return JSON only matching the provided schema.`;

export const DEFAULT_EXPERIENCE_SKILLS_PROMPT = `You generate company experience skill lists for an ATS-friendly resume.

The user message contains company context, achievement bullets, candidate key/modern skills, and assigned mandatory JD skills for a single role.

Return a clean array of named TECH STACK items only — real products, languages, frameworks, databases, cloud platforms, and tools.

RULES
- Start from technologies explicitly mentioned or clearly implied in the achievement bullets
- Keep recent modern frameworks, languages, and key technologies from the candidate skill set
- ADD assigned mandatory JD skills — do not replace the list with JD-only skills
- Named technologies only: TypeScript, React, Node.js, PostgreSQL, Kafka, AWS, Docker
- NEVER use vague categories or themes as skills (e.g. "event-based frameworks", "cloud technologies", "modern stack")
- If a bullet mentions Kafka, include Kafka — do not generalize to vague categories
- 1–4 words per skill; use standard market names
- No compliance, regulations, certifications, soft skills, design practices, or achievement sentences
- Use AWS / Azure / GCP as platform names (not EC2/RDS/S3 lists)
- When a target count is provided, return about that many skills while keeping the modern/key stack and added mandatory skills
- Return JSON only: { "skills": ["TypeScript", "React", "Kafka", "AWS"] }`;

export const DEFAULT_SUMMARY_PROMPT = `You are an expert resume writer. Write a professional summary about the candidate's real projects.

LENGTH (hard limit)
- One paragraph of 4–5 sentences.
- 100–120 words. Do not go below 100 words. Never exceed 120 words.
- No bullets, no lists, no comma-separated skill dump.

CONTENT
- Keep the official professional title and seniority.
- Mention 1–2 real companies/products. Keep the candidate's modern skillsets in that story.
- The summary MUST contain the mandatory JD skills and the mandatory JD experience (years, seniority, domain/themes).
- ADD those JD items into the real-project narrative with modern languages/frameworks. Stay realistic. Do not replace the summary with a JD checklist or skill dump.
- Customize wording toward the JD's domain. Do not rewrite the candidate as a different occupation.
- When years of experience are provided, state them exactly as "N+ years of experience" in the first sentence.
- Stay truthful. Avoid generic filler.
Return JSON only: { "summary": "..." }`;

export const DEFAULT_SKILLS_PROMPT = `You are an expert resume writer. Build an ATS-friendly TECHNICAL SKILLS (Core Technologies) section for the resume.

Company experience bullets are generated FIRST. This section is assembled AFTER those bullets.

Use ALL sources provided in the user message:
1. Role-proven skills — technologies named in each company's achievement bullets (must appear)
2. Baseline skills — the candidate's core inventory
3. Company context — products and missions that imply relevant stacks
4. Job description — include matching keywords, especially those already evidenced in experience
5. When JD skills are listed separately, include them in Core Technologies, but do not treat this section as a substitute for experience evidence

RULES
- Experience is the primary evidence of JD skills; Core Technologies summarizes them
- Include every JD skill when a JD skill list is provided
- Include supported skills from baseline and role-proven lists — do not invent unsupported tech
- When a per-category max is provided, each included category should have between 6 and that max skills (6 is the floor)
- Category sizes must look realistic and vary within that range (e.g. 6 in Testing, 9 in Backend). Do not pad every category to the max.
- Skip categories with no supported skills. Do not invent filler skills to reach a count.
- Prefer specific technologies, frameworks, platforms, tools, and methodologies over vague soft skills
- De-duplicate across categories; place each skill in the most specific applicable category
- Category guide: Languages (TypeScript, Python, Go, SQL); Backend (Node.js, NestJS, Spring Boot, REST, GraphQL); Frontend (React, Next.js, Tailwind, React Native); AI (LLMs, OpenAI API, LangChain, RAG, PyTorch, AI automation); Cloud & DevOps (AWS, Docker, Kubernetes, Terraform, CI/CD, Git); Data & Messaging (PostgreSQL, MongoDB, Redis, Elasticsearch, Kafka, RabbitMQ, SQS, Snowflake); Testing (Jest, Cypress, Playwright); Architecture (Microservices, Event-Driven, System Design, DDD, Agile); Industries (Healthcare, Fintech, E-commerce)
- Use ONLY the enabled category names exactly as given (e.g. "Data & Messaging", not "Database"; "AI", not "AI & Automation")
- Keep items concise (1–4 words each) and ATS-friendly
- Return JSON only matching the provided schema: { "skills": [{ "category": "Backend", "items": ["Node.js", "Express"] }] }
- category and each items entry must be plain strings (not objects)`;

export const DEFAULT_TITLE_MATCH_PROMPT = `You compare the candidate's official professional title to a job description.

Given the job description, the candidate's professional title, and their company role titles:
- Infer the JD's target role name as rootTitle (2–5 words, market-standard).
- Compare similarity between the candidate's official professional title and that rootTitle (0.0–1.0).
- Official employment titles must never be rewritten. This comparison is informational only.

Return JSON only: { "rootTitle": "...", "similarity": 0.0 }`;

export const DEFAULT_JD_REQUIREMENTS_PROMPT = `You extract MANDATORY required technical skills from a job description.

Use high precision. Quality over quantity. Return only must-have skills.

languages: programming languages that are required / must-have (not preferred or bonus).
requiredSkills: frameworks, platforms, tools, databases, and cloud products that are required / must-have (not preferred, plus, or nice-to-have).
experienceThemes: short domain/focus phrases used only to customize writing (not skills).
experienceRequirements: years, seniority, domain expectations used only to customize writing (not skills).

Rules:
- Include a technology ONLY if the JD clearly marks it as required, must-have, or essential (or lists it under Required / Qualifications / Must have with no preferred qualifier).
- Do NOT include preferred, nice-to-have, bonus, plus, or "familiarity with" items.
- Do NOT infer related stacks, fill gaps, or add implied tools (no AWS→Azure, no React→Next.js unless the JD requires it).
- Do NOT invent technologies that are not written in the JD.
- Skills must be concrete named technologies (TypeScript, React, PostgreSQL, AWS) — not themes, duties, or soft skills.
- Be specific and concise (1–8 words per item).
- Return JSON only matching the provided schema.`;

export const DEFAULT_JOB_POSTING_EXTRACT_PROMPT = `You extract one job posting from messy webpage text. Nav, cookies, related jobs, and application-form chrome may be mixed in.

Return JSON only:
- companyName: hiring company only (not a job board like Greenhouse or LinkedIn)
- roleType: the job title only
- jobDescription: the posting itself in clean prose. Include responsibilities and requirements. Exclude cookie banners, related jobs, apply-button chrome, and screening questions.

If hints look correct, keep them. If the page is an application form with little description, still return the best company and title and put any visible role summary in jobDescription.
Do not invent a company or title that is not supported by the page or hints.`;
