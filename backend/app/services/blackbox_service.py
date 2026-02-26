import json
import requests
from ..utils.prompts import (
    CAREER_CONSULTANT_PROMPT,
    CAREER_CONSULTANT_SAVE_SUMMARY_PROMPT,
    CHAT_PROMPT,
    HISTORY_ANALYSIS_PROMPT,
    LINKEDIN_EXTRACT_PROMPT,
)


class BlackboxService:
    """Service to interact with Blackbox AI API for smarter career consulting responses."""

    API_URL = "https://api.blackbox.ai/api/chat"

    def __init__(self, api_key=None):
        self.api_key = api_key
        self.headers = {
            "Content-Type": "application/json",
        }
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"

    def _generate(self, prompt, max_tokens=2048):
        """Send a prompt to Blackbox AI and return the response text."""
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            "model": "blackboxai",
            "max_tokens": max_tokens,
        }

        try:
            response = requests.post(
                self.API_URL,
                headers=self.headers,
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()

            # Extract the response text from the API response
            if isinstance(data, str):
                return data
            if isinstance(data, dict):
                # Handle different response formats
                if "choices" in data:
                    return data["choices"][0]["message"]["content"]
                if "response" in data:
                    return data["response"]
                if "message" in data:
                    return data["message"]
                if "content" in data:
                    return data["content"]
            return str(data)
        except requests.exceptions.RequestException as e:
            raise Exception(f"Blackbox AI API error: {str(e)}")

    def career_consultant_chat(self, message, context):
        """Handle career consultant chat using Blackbox AI."""
        profile_section = ""
        if context.get('profile'):
            p = context['profile']
            skills = ', '.join(p.get('skills', [])) if isinstance(p.get('skills'), list) else str(p.get('skills', ''))
            experiences = json.dumps(p.get('work_experiences', []), ensure_ascii=False)
            education = json.dumps(p.get('education', []), ensure_ascii=False)
            languages = json.dumps(p.get('languages', []), ensure_ascii=False)
            profile_section = (
                f"Candidate profile:\n"
                f"- Name: {p.get('full_name', 'N/A')}\n"
                f"- Location: {p.get('location', 'N/A')}\n"
                f"- Summary: {p.get('professional_summary', 'N/A')}\n"
                f"- Skills: {skills}\n"
                f"- Experience: {experiences}\n"
                f"- Education: {education}\n"
                f"- Languages: {languages}"
            )

        application_section = ""
        if context.get('application'):
            app = context['application']
            application_section = (
                f"Linked application:\n"
                f"- Company: {app.get('company', 'N/A')}\n"
                f"- Role: {app.get('role', 'N/A')}\n"
                f"- Status: {app.get('status', 'N/A')}\n"
                f"- Location: {app.get('location', 'N/A')}\n"
                f"- Job Description: {(app.get('job_description') or '')[:500]}\n"
                f"- Match Score: {app.get('match_score', 'N/A')}"
            )

        history_parts = []
        for msg in context.get('history', [])[-15:]:
            history_parts.append(f"{msg['role']}: {msg['content']}")
        history = '\n'.join(history_parts) if history_parts else 'No previous messages — this is the start of the conversation.'

        prompt = CAREER_CONSULTANT_PROMPT.format(
            profile_section=profile_section,
            application_section=application_section,
            history=history,
            topic=context.get('topic', 'general'),
            message=message,
        )
        return self._generate(prompt)

    def career_consultant_summarize(self, conversation, company, role):
        """Summarize a career consultant conversation."""
        prompt = CAREER_CONSULTANT_SAVE_SUMMARY_PROMPT.format(
            conversation=conversation,
            company=company,
            role=role,
        )
        return self._generate(prompt)

    def analyze_application_history(self, applications, profile):
        """Analyze user's full application history and return AI insights."""
        from datetime import datetime, timezone, timedelta

        # Build applications summary
        apps_lines = []
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)

        for app in applications:
            applied = app.get('applied_date', 'N/A')
            line = (
                f"- {app.get('company', 'N/A')} | {app.get('role', 'N/A')} | "
                f"Status: {app.get('status', 'N/A')} | Applied: {applied} | "
                f"Match Score: {app.get('match_score', 'N/A')}"
            )
            apps_lines.append(line)

        applications_summary = '\n'.join(apps_lines) if apps_lines else 'No applications yet.'

        skills = profile.get('skills', [])
        if isinstance(skills, list):
            skills_str = ', '.join(skills)
        else:
            skills_str = str(skills)

        prompt = HISTORY_ANALYSIS_PROMPT.format(
            full_name=profile.get('full_name', 'N/A'),
            skills=skills_str,
            location=profile.get('location', 'N/A'),
            professional_summary=profile.get('professional_summary', 'N/A'),
            total_apps=len(applications),
            applications_summary=applications_summary,
        )

        response_text = self._generate(prompt, max_tokens=3000)

        # Parse JSON response
        try:
            # Strip markdown code fences if present
            clean = response_text.strip()
            if clean.startswith('```'):
                clean = clean.split('```')[1]
                if clean.startswith('json'):
                    clean = clean[4:]
            return json.loads(clean)
        except Exception:
            return {'summary': response_text, 'raw': True}

    def extract_linkedin_profile(self, text):
        """Extract profile data from LinkedIn profile text."""
        prompt = LINKEDIN_EXTRACT_PROMPT.format(text=text)
        response_text = self._generate(prompt, max_tokens=2000)

        try:
            clean = response_text.strip()
            if clean.startswith('```'):
                clean = clean.split('```')[1]
                if clean.startswith('json'):
                    clean = clean[4:]
            return json.loads(clean)
        except Exception:
            raise Exception(f'Failed to parse LinkedIn profile: {response_text[:200]}')

    def chat(self, message, context):
        """Handle general chat using Blackbox AI."""
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
