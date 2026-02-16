import requests


class AdzunaService:
    BASE_URL = 'https://api.adzuna.com/v1/api/jobs'

    def __init__(self, app_id, api_key):
        self.app_id = app_id
        self.api_key = api_key

    def search_jobs(self, query, location='', country='it', page=1, per_page=15):
        """Search for jobs on Adzuna. Returns normalized results."""
        url = f'{self.BASE_URL}/{country}/search/{page}'

        params = {
            'app_id': self.app_id,
            'app_key': self.api_key,
            'what': query,
            'results_per_page': per_page,
            'content-type': 'application/json',
        }

        if location:
            params['where'] = location

        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        total = data.get('count', 0)
        raw_results = data.get('results', [])

        jobs = []
        for r in raw_results:
            company_name = r.get('company', {}).get('display_name', '') if isinstance(r.get('company'), dict) else ''
            location_name = r.get('location', {}).get('display_name', '') if isinstance(r.get('location'), dict) else ''

            jobs.append({
                'adzuna_id': str(r.get('id', '')),
                'title': r.get('title', ''),
                'company': company_name,
                'location': location_name,
                'salary_min': r.get('salary_min'),
                'salary_max': r.get('salary_max'),
                'url': r.get('redirect_url', ''),
                'description': r.get('description', ''),
                'created': r.get('created', ''),
                'contract_type': r.get('contract_type', ''),
                'category': r.get('category', {}).get('label', '') if isinstance(r.get('category'), dict) else '',
            })

        pages = (total + per_page - 1) // per_page if total > 0 else 0

        return {
            'jobs': jobs,
            'total': total,
            'page': page,
            'pages': min(pages, 100),  # Adzuna limits to ~100 pages
        }
