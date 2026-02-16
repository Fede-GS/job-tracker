PARSE_JOB_POST_PROMPT = """Analyze the following job posting and extract structured information.
Return your response as a valid JSON object with these exact fields:
- company (string): the company name
- role (string): the job title
- location (string): work location including remote/hybrid/on-site status
- requirements (array of strings): key requirements and qualifications
- salary_min (integer or null): lower salary bound if mentioned
- salary_max (integer or null): upper salary bound if mentioned
- salary_currency (string or null): currency code (EUR, USD, GBP, etc.) if salary mentioned
- employment_type (string or null): full-time, part-time, contract, freelance, etc.
- experience_years (string or null): required years of experience if mentioned
- key_skills (array of strings): main technical and soft skills required
- deadline (string or null): application deadline in YYYY-MM-DD format if mentioned
- job_description_summary (string): a 2-3 sentence summary of what the role involves

If a field cannot be determined from the posting, use null.
Only return the JSON object, no additional text or markdown code fences.

Job posting:
---
{text}
---"""

GENERATE_CV_PROMPT = """You are an expert CV/resume writer. Generate or improve a professional CV tailored to the following job description.

Job Description:
---
{job_description}
---

{current_cv_section}

{instructions_section}

Write a professional, well-structured CV in markdown format with these sections:
- Professional Summary (3-4 lines, tailored to the job)
- Key Skills (bullet points, matching job requirements)
- Professional Experience (most relevant roles with achievements)
- Education
- Languages (if relevant)
- Certifications (if relevant)

Guidelines:
- Use action verbs and quantifiable achievements
- Tailor content to match the job requirements
- Keep it concise (max 2 pages equivalent)
- Use professional tone
- Write in the same language as the job posting"""

GENERATE_COVER_LETTER_PROMPT = """You are an expert cover letter writer. Generate a professional, compelling cover letter.

Company: {company}
Role: {role}

Job Description:
---
{job_description}
---

{instructions_section}

Write a professional cover letter in markdown format:
- Opening paragraph: Express enthusiasm and mention the specific role
- Middle paragraphs: Highlight relevant skills and experience matching job requirements
- Closing paragraph: Call to action, express availability for interview

Guidelines:
- Personalize for the company and role
- Show you've researched the company
- Keep it to one page (3-4 paragraphs)
- Professional but engaging tone
- Write in the same language as the job posting"""

SUMMARIZE_APPLICATION_PROMPT = """Create a concise summary of this job application for tracking purposes.

Company: {company}
Role: {role}
Location: {location}
Status: {status}
Applied: {applied_date}
Salary Range: {salary_range}

Job Description:
---
{job_description}
---

Requirements:
---
{requirements}
---

Notes:
---
{notes}
---

Write a brief 3-5 sentence summary covering:
1. What the role involves
2. Key requirements
3. Current application status
4. Any notable details

Write in the same language as the job posting."""

IMPROVE_TEXT_PROMPT = """You are a professional writing assistant. Improve the following text.

{instructions_section}

Text to improve:
---
{text}
---

Return only the improved text, no explanations. Maintain the original language."""

EXTRACT_CV_PROFILE_PROMPT = """Extract structured profile information from the following CV/resume text.
Return your response as a valid JSON object with these exact fields:

- full_name (string or null)
- email (string or null)
- phone (string or null)
- location (string or null)
- linkedin_url (string or null)
- portfolio_url (string or null)
- professional_summary (string): a 3-4 sentence professional summary
- work_experiences (array of objects): each with "title", "company", "location", "start_date", "end_date", "description"
- education (array of objects): each with "degree", "institution", "year", "description"
- skills (array of strings): technical and soft skills
- languages (array of objects): each with "language", "level"
- certifications (array of objects): each with "name", "issuer", "year"

Extract as much information as possible. If a field cannot be determined, use null for strings or empty array for arrays.
Only return the JSON object, no additional text or markdown code fences.

CV Text:
---
{text}
---"""

MATCH_ANALYSIS_PROMPT = """You are an expert recruiter and career advisor. Analyze the match between this candidate's profile and the job posting.

Candidate Profile:
---
Name: {full_name}
Summary: {professional_summary}
Skills: {skills}
Experience: {work_experiences}
Education: {education}
Languages: {languages}
---

Job Posting:
---
{job_posting}
---

Return your response as a valid JSON object with these exact fields:
- match_score (float between 0.0 and 10.0): overall compatibility score
- strengths (array of strings): 3-5 points where the candidate matches well
- gaps (array of strings): 2-4 areas where the candidate could improve or lacks requirements
- recommendation (string): a 2-3 sentence recommendation on whether to apply and how to position themselves
- key_requirements_met (array of strings): which key job requirements the candidate meets
- key_requirements_missing (array of strings): which key job requirements the candidate is missing

Be realistic and honest in scoring. A score of 7+ means strong match, 5-7 moderate, below 5 weak.
Only return the JSON object, no additional text or markdown code fences."""

TAILOR_CV_HTML_PROMPT = """You are an expert CV writer. Generate a professional CV tailored to the job posting, using the candidate's profile data.

Candidate Profile:
---
Name: {full_name}
Email: {email}
Phone: {phone}
Location: {location}
LinkedIn: {linkedin_url}
Portfolio: {portfolio_url}
Summary: {professional_summary}
Experience: {work_experiences}
Education: {education}
Skills: {skills}
Languages: {languages}
Certifications: {certifications}
---

Job Posting:
---
{job_posting}
---

{instructions_section}

Generate a professional CV in clean HTML format (for use in a rich text editor, NOT a full HTML document).
Use these HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>

Structure:
1. <h1> with candidate name
2. Contact info paragraph
3. <h2>Professional Summary</h2> - tailored to job
4. <h2>Key Skills</h2> - bullet list matching job requirements
5. <h2>Professional Experience</h2> - emphasize relevant experience
6. <h2>Education</h2>
7. <h2>Languages</h2> (if relevant)
8. <h2>Certifications</h2> (if relevant)

Guidelines:
- Tailor content to emphasize relevant experience for this specific job
- Use the candidate's real data, do NOT fabricate information
- Enhance presentation and wording for impact
- Write in the same language as the job posting
- Return ONLY the HTML content, no markdown, no code fences"""

GENERATE_COVER_LETTER_HTML_PROMPT = """You are an expert cover letter writer. Generate a professional cover letter using the candidate's profile for this job.

Candidate Profile:
---
Name: {full_name}
Summary: {professional_summary}
Experience: {work_experiences}
Skills: {skills}
---

Company: {company}
Role: {role}

Job Posting:
---
{job_posting}
---

{instructions_section}

Generate a professional cover letter in clean HTML format (for use in a rich text editor).
Use these HTML tags: <h1>, <p>, <strong>, <em>

Structure:
- <p> with date and company address
- <h1>Cover Letter</h1> or appropriate heading
- Opening paragraph: enthusiasm for the role at this company
- 2-3 middle paragraphs: relevant skills and experience from the profile matching job requirements
- Closing paragraph: call to action, availability for interview
- <p> with signature (candidate name)

Guidelines:
- Use the candidate's REAL experience and skills
- Personalize for the specific company and role
- Professional but engaging tone
- Write in the same language as the job posting
- Return ONLY the HTML content, no markdown, no code fences"""

GENERATE_FOLLOWUP_PROMPT = """You are an expert career advisor. Generate a professional follow-up email for a job application.

Candidate:
- Name: {full_name}
- Summary: {professional_summary}

Application:
- Company: {company}
- Role: {role}
- Status: {status}
- Applied on: {applied_date}
- Context: {context}

Generate a follow-up email in the same language as the role/company (if Italian company, write in Italian; if English, write in English).

Return your response as a valid JSON object with these exact fields:
- subject (string): email subject line
- body (string): full email body text (professional, concise, 150-200 words)
- tone (string): one of "formal", "friendly", "assertive"
- tips (array of strings): 3-4 actionable tips for following up effectively

Only return the JSON object, no additional text or markdown code fences."""

INTERVIEW_PREP_PROMPT = """You are an expert interview coach. Prepare a comprehensive interview preparation guide for this candidate and position.

Candidate Profile:
---
Name: {full_name}
Summary: {professional_summary}
Skills: {skills}
Experience: {work_experiences}
Education: {education}
Languages: {languages}
---

Company: {company}
Role: {role}

Job Posting:
---
{job_posting}
---

Generate a detailed interview preparation guide. Return your response as a valid JSON object with these exact fields:

- likely_questions (array of objects): 6-8 probable interview questions, each with:
  - question (string): the interview question
  - category (string): one of "behavioral", "technical", "situational", "company_knowledge"
  - difficulty (string): one of "easy", "medium", "hard"
  - why_asked (string): brief explanation of why the interviewer asks this

- star_answers (array of objects): 4-5 STAR method answer templates based on the candidate's real experience, each with:
  - question (string): the question this answers
  - situation (string): describe a relevant situation from the candidate's background
  - task (string): what was the task/challenge
  - action (string): what actions the candidate took
  - result (string): the outcome/result

- company_tips (array of objects): 4-5 company-specific preparation tips, each with:
  - tip (string): the advice
  - category (string): one of "culture", "industry", "recent_news", "preparation"

- general_advice (array of strings): 4-5 general interview tips specific to this role type

Write in the same language as the job posting.
Only return the JSON object, no additional text or markdown code fences."""

CHAT_PROMPT = """You are a helpful career advisor AI assistant. The user is working on a job application.

Context:
- Current step: {step}
- Company: {company}
- Role: {role}

{profile_section}

{job_posting_section}

{match_section}

Conversation history:
{history}

User message: {message}

Respond helpfully and concisely. If the user asks about their chances, refer to the match analysis.
If they ask for improvements, give specific actionable advice.
Keep responses focused and under 200 words unless more detail is needed.
Respond in the same language the user writes in."""
