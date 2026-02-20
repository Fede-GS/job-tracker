import json
import re
import google.generativeai as genai
from ..utils.prompts import (
    PARSE_JOB_POST_PROMPT,
    GENERATE_CV_PROMPT,
    GENERATE_COVER_LETTER_PROMPT,
    SUMMARIZE_APPLICATION_PROMPT,
    IMPROVE_TEXT_PROMPT,
    EXTRACT_CV_PROFILE_PROMPT,
    MATCH_ANALYSIS_PROMPT,
    TAILOR_CV_HTML_PROMPT,
    TAILOR_CV_WITH_TEMPLATE_PROMPT,
    GENERATE_COVER_LETTER_HTML_PROMPT,
    CHAT_PROMPT,
    GENERATE_FOLLOWUP_PROMPT,
    INTERVIEW_PREP_PROMPT,
)


class GeminiService:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def _generate(self, prompt):
        response = self.model.generate_content(prompt)
        return response.text

    def _parse_json_response(self, text):
        cleaned = re.sub(r'```(?:json)?\s*', '', text)
        cleaned = cleaned.strip().rstrip('`')
        return json.loads(cleaned)

    def parse_job_posting(self, text):
        prompt = PARSE_JOB_POST_PROMPT.format(text=text)
        result = self._generate(prompt)
        return self._parse_json_response(result)

    def generate_cv(self, job_description, current_cv=None, instructions=None):
        current_cv_section = ""
        if current_cv:
            current_cv_section = f"Current CV to improve:\n---\n{current_cv}\n---\n\nImprove this CV to better match the job. Keep factual information but enhance presentation."

        instructions_section = ""
        if instructions:
            instructions_section = f"Additional instructions: {instructions}"

        prompt = GENERATE_CV_PROMPT.format(
            job_description=job_description,
            current_cv_section=current_cv_section,
            instructions_section=instructions_section,
        )
        return self._generate(prompt)

    def generate_cover_letter(self, job_description, company, role, instructions=None):
        instructions_section = ""
        if instructions:
            instructions_section = f"Additional instructions: {instructions}"

        prompt = GENERATE_COVER_LETTER_PROMPT.format(
            company=company,
            role=role,
            job_description=job_description,
            instructions_section=instructions_section,
        )
        return self._generate(prompt)

    def summarize_application(self, application_data):
        salary_range = "Not specified"
        if application_data.get('salary_min') and application_data.get('salary_max'):
            currency = application_data.get('salary_currency', 'EUR')
            salary_range = f"{application_data['salary_min']}-{application_data['salary_max']} {currency}"

        prompt = SUMMARIZE_APPLICATION_PROMPT.format(
            company=application_data.get('company', 'N/A'),
            role=application_data.get('role', 'N/A'),
            location=application_data.get('location', 'N/A'),
            status=application_data.get('status', 'N/A'),
            applied_date=application_data.get('applied_date', 'N/A'),
            salary_range=salary_range,
            job_description=application_data.get('job_description', 'Not provided'),
            requirements=application_data.get('requirements', 'Not provided'),
            notes=application_data.get('notes', 'None'),
        )
        return self._generate(prompt)

    def improve_text(self, text, instructions=None):
        instructions_section = ""
        if instructions:
            instructions_section = f"Instructions: {instructions}"

        prompt = IMPROVE_TEXT_PROMPT.format(
            text=text,
            instructions_section=instructions_section,
        )
        return self._generate(prompt)

    def extract_profile_from_cv(self, cv_text):
        prompt = EXTRACT_CV_PROFILE_PROMPT.format(text=cv_text)
        result = self._generate(prompt)
        return self._parse_json_response(result)

    def analyze_match(self, job_posting, profile):
        skills_str = ', '.join(profile.get('skills', [])) if isinstance(profile.get('skills'), list) else str(profile.get('skills', ''))
        experiences_str = json.dumps(profile.get('work_experiences', []), ensure_ascii=False)
        education_str = json.dumps(profile.get('education', []), ensure_ascii=False)
        languages_str = json.dumps(profile.get('languages', []), ensure_ascii=False)

        prompt = MATCH_ANALYSIS_PROMPT.format(
            full_name=profile.get('full_name', 'N/A'),
            professional_summary=profile.get('professional_summary', 'N/A'),
            skills=skills_str,
            work_experiences=experiences_str,
            education=education_str,
            languages=languages_str,
            job_posting=job_posting,
        )
        result = self._generate(prompt)
        return self._parse_json_response(result)

    def tailor_cv_html(self, job_posting, profile, instructions=None):
        instructions_section = ""
        if instructions:
            instructions_section = f"Additional instructions: {instructions}"

        prompt = TAILOR_CV_HTML_PROMPT.format(
            full_name=profile.get('full_name', ''),
            email=profile.get('email', ''),
            phone=profile.get('phone', ''),
            location=profile.get('location', ''),
            linkedin_url=profile.get('linkedin_url', ''),
            portfolio_url=profile.get('portfolio_url', ''),
            professional_summary=profile.get('professional_summary', ''),
            work_experiences=json.dumps(profile.get('work_experiences', []), ensure_ascii=False),
            education=json.dumps(profile.get('education', []), ensure_ascii=False),
            skills=json.dumps(profile.get('skills', []), ensure_ascii=False),
            languages=json.dumps(profile.get('languages', []), ensure_ascii=False),
            certifications=json.dumps(profile.get('certifications', []), ensure_ascii=False),
            job_posting=job_posting,
            instructions_section=instructions_section,
        )
        result = self._generate(prompt)
        # Strip any markdown code fences
        cleaned = re.sub(r'```(?:html)?\s*', '', result)
        cleaned = cleaned.strip().rstrip('`')
        return cleaned

    def tailor_cv_with_template(self, job_posting, profile, template_id='classic',
                                include_photo=False, max_pages=1, skills_format='list',
                                instructions=None):
        instructions_section = ""
        if instructions:
            instructions_section = f"Additional instructions: {instructions}"

        prompt = TAILOR_CV_WITH_TEMPLATE_PROMPT.format(
            full_name=profile.get('full_name', ''),
            email=profile.get('email', ''),
            phone=profile.get('phone', ''),
            location=profile.get('location', ''),
            linkedin_url=profile.get('linkedin_url', ''),
            portfolio_url=profile.get('portfolio_url', ''),
            professional_summary=profile.get('professional_summary', ''),
            work_experiences=json.dumps(profile.get('work_experiences', []), ensure_ascii=False),
            education=json.dumps(profile.get('education', []), ensure_ascii=False),
            skills=json.dumps(profile.get('skills', []), ensure_ascii=False),
            languages=json.dumps(profile.get('languages', []), ensure_ascii=False),
            certifications=json.dumps(profile.get('certifications', []), ensure_ascii=False),
            job_posting=job_posting,
            template_id=template_id,
            include_photo=str(include_photo).lower(),
            max_pages=max_pages,
            skills_format=skills_format,
            instructions_section=instructions_section,
        )
        result = self._generate(prompt)
        cleaned = re.sub(r'```(?:html)?\s*', '', result)
        cleaned = cleaned.strip().rstrip('`')
        return cleaned

    def generate_cover_letter_html(self, job_posting, profile, company, role, instructions=None):
        instructions_section = ""
        if instructions:
            instructions_section = f"Additional instructions: {instructions}"

        prompt = GENERATE_COVER_LETTER_HTML_PROMPT.format(
            full_name=profile.get('full_name', ''),
            professional_summary=profile.get('professional_summary', ''),
            work_experiences=json.dumps(profile.get('work_experiences', []), ensure_ascii=False),
            skills=json.dumps(profile.get('skills', []), ensure_ascii=False),
            company=company,
            role=role,
            job_posting=job_posting,
            instructions_section=instructions_section,
        )
        result = self._generate(prompt)
        cleaned = re.sub(r'```(?:html)?\s*', '', result)
        cleaned = cleaned.strip().rstrip('`')
        return cleaned

    def generate_followup(self, application_data, profile, context_description):
        prompt = GENERATE_FOLLOWUP_PROMPT.format(
            full_name=profile.get('full_name', 'N/A'),
            professional_summary=profile.get('professional_summary', 'N/A'),
            company=application_data.get('company', 'N/A'),
            role=application_data.get('role', 'N/A'),
            status=application_data.get('status', 'N/A'),
            applied_date=application_data.get('applied_date', 'N/A'),
            context=context_description,
        )
        result = self._generate(prompt)
        return self._parse_json_response(result)

    def generate_interview_prep(self, application_data, profile):
        skills_str = ', '.join(profile.get('skills', [])) if isinstance(profile.get('skills'), list) else str(profile.get('skills', ''))
        experiences_str = json.dumps(profile.get('work_experiences', []), ensure_ascii=False)
        education_str = json.dumps(profile.get('education', []), ensure_ascii=False)
        languages_str = json.dumps(profile.get('languages', []), ensure_ascii=False)

        prompt = INTERVIEW_PREP_PROMPT.format(
            full_name=profile.get('full_name', 'N/A'),
            professional_summary=profile.get('professional_summary', 'N/A'),
            skills=skills_str,
            work_experiences=experiences_str,
            education=education_str,
            languages=languages_str,
            company=application_data.get('company', 'N/A'),
            role=application_data.get('role', 'N/A'),
            job_posting=application_data.get('job_posting_text', 'Not available'),
        )
        result = self._generate(prompt)
        return self._parse_json_response(result)

    def chat(self, message, context):
        profile_section = ""
        if context.get('profile'):
            p = context['profile']
            profile_section = f"Candidate profile: {p.get('full_name', 'N/A')}, Skills: {', '.join(p.get('skills', []))}"

        job_posting_section = ""
        if context.get('job_posting'):
            job_posting_section = f"Job posting:\n{context['job_posting'][:500]}"

        match_section = ""
        if context.get('match_analysis'):
            ma = context['match_analysis']
            match_section = f"Match score: {ma.get('match_score', 'N/A')}/10"

        history_parts = []
        for msg in context.get('history', [])[-10:]:
            history_parts.append(f"{msg['role']}: {msg['content']}")
        history = '\n'.join(history_parts) if history_parts else 'No previous messages.'

        prompt = CHAT_PROMPT.format(
            step=context.get('step', 'general'),
            company=context.get('company', 'N/A'),
            role=context.get('role', 'N/A'),
            profile_section=profile_section,
            job_posting_section=job_posting_section,
            match_section=match_section,
            history=history,
            message=message,
        )
        return self._generate(prompt)
