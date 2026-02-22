import requests


class JSearchService:
    BASE_URL = 'https://jsearch.p.rapidapi.com/search'

    def __init__(self, api_key):
        self.api_key = api_key

    def search_jobs(self, query, location='', page=1, per_page=15):
        """Search for jobs on JSearch (RapidAPI). Returns normalized results."""
        search_query = query
        if location:
            search_query = f'{query} in {location}'

        headers = {
            'X-RapidAPI-Key': self.api_key,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        }

        params = {
            'query': search_query,
            'page': str(page),
            'num_pages': '1',
        }

        response = requests.get(self.BASE_URL, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        raw_results = data.get('data', [])

        # Total estimated results from API
        total = len(raw_results)
        # JSearch doesn't return total count reliably, estimate from results
        # If we got a full page, assume there are more
        if len(raw_results) >= 10:
            total = page * 10 + 10  # rough estimate for pagination

        jobs = []
        for r in raw_results:
            # Build location string
            parts = [p for p in [r.get('job_city'), r.get('job_state'), r.get('job_country')] if p]
            location_str = ', '.join(parts)

            # Get salary info
            salary_min = r.get('job_min_salary')
            salary_max = r.get('job_max_salary')

            # Get apply link - prefer direct apply, fallback to apply options
            apply_link = r.get('job_apply_link', '')
            if not apply_link:
                apply_options = r.get('apply_options', [])
                if apply_options:
                    apply_link = apply_options[0].get('apply_link', '')

            jobs.append({
                'adzuna_id': r.get('job_id', ''),
                'title': r.get('job_title', ''),
                'company': r.get('employer_name', ''),
                'location': location_str,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'url': apply_link,
                'description': r.get('job_description', ''),
                'created': r.get('job_posted_at_datetime_utc', ''),
                'contract_type': r.get('job_employment_type', ''),
                'category': '',
                'employer_logo': r.get('employer_logo'),
                'is_remote': r.get('job_is_remote', False),
            })

        pages = page + 1 if len(raw_results) >= 10 else page

        return {
            'jobs': jobs,
            'total': total,
            'page': page,
            'pages': pages,
        }
