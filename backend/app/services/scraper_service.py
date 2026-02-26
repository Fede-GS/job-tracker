import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse


class ScraperService:
    """Universal job posting scraper that works with any URL."""

    # Common headers to mimic a real browser
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,it;q=0.8,nb;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
    }

    # Tags to remove completely (they contain no useful text)
    REMOVE_TAGS = [
        'script', 'style', 'nav', 'header', 'footer', 'noscript',
        'svg', 'iframe', 'form', 'button', 'input', 'select',
        'textarea', 'meta', 'link', 'img', 'video', 'audio',
    ]

    # CSS selectors for common job posting content areas (ordered by priority)
    JOB_CONTENT_SELECTORS = [
        # LinkedIn
        '.description__text',
        '.show-more-less-html__markup',
        '.jobs-description__content',
        '.jobs-description-content__text',
        # Indeed
        '#jobDescriptionText',
        '.jobsearch-jobDescriptionText',
        '.jobsearch-JobComponent-description',
        # Glassdoor
        '.jobDescriptionContent',
        '.desc',
        '[class*="JobDescription"]',
        '[class*="jobDescription"]',
        # Finn.no (Norway)
        '.import-decoration',
        '.job-posting-description',
        '[data-testid="job-description"]',
        # Monster
        '#JobDescription',
        '.job-description',
        # StepStone
        '[class*="job-ad-display"]',
        '.listing-content',
        # InfoJobs
        '.description-text',
        # Generic / Company sites
        '[class*="job-description"]',
        '[class*="jobDescription"]',
        '[class*="job_description"]',
        '[class*="job-detail"]',
        '[class*="jobDetail"]',
        '[class*="job_detail"]',
        '[class*="vacancy-description"]',
        '[class*="posting-description"]',
        '[class*="career-description"]',
        '[id*="job-description"]',
        '[id*="jobDescription"]',
        '[id*="job_description"]',
        '[id*="job-detail"]',
        '[id*="jobDetail"]',
        'article',
        '[role="main"]',
        'main',
        '.content',
        '#content',
    ]

    # Selectors for job metadata (title, company, location, etc.)
    JOB_TITLE_SELECTORS = [
        'h1.job-title', 'h1.jobTitle', '.job-title h1', '.jobTitle',
        'h1[class*="title"]', 'h1[class*="Title"]',
        '.top-card-layout__title', '.jobs-unified-top-card__job-title',
        '.jobsearch-JobInfoHeader-title',
        'h1',
    ]

    COMPANY_SELECTORS = [
        '.company-name', '.companyName', '[class*="company"]',
        '.top-card-layout__company', '.jobs-unified-top-card__company-name',
        '.jobsearch-InlineCompanyRating',
        '[class*="Company"]', '[class*="employer"]',
    ]

    LOCATION_SELECTORS = [
        '.job-location', '.jobLocation', '[class*="location"]',
        '.top-card-layout__bullet', '.jobs-unified-top-card__bullet',
        '.jobsearch-JobInfoHeader-subtitle',
        '[class*="Location"]',
    ]

    @staticmethod
    def validate_url(url):
        """Validate that the input is a proper URL."""
        try:
            result = urlparse(url)
            return all([result.scheme in ('http', 'https'), result.netloc])
        except Exception:
            return False

    @staticmethod
    def get_domain(url):
        """Extract the domain from a URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            # Remove www. prefix
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except Exception:
            return ''

    def fetch_page(self, url, timeout=15):
        """Fetch the HTML content of a page."""
        try:
            response = requests.get(
                url,
                headers=self.HEADERS,
                timeout=timeout,
                allow_redirects=True,
                verify=True,
            )
            response.raise_for_status()

            # Try to detect encoding
            if response.encoding and response.encoding.lower() != 'utf-8':
                response.encoding = response.apparent_encoding

            return response.text
        except requests.exceptions.Timeout:
            raise Exception(f'Request timed out after {timeout} seconds. The website may be slow or blocking automated requests.')
        except requests.exceptions.TooManyRedirects:
            raise Exception('Too many redirects. The URL may be invalid.')
        except requests.exceptions.ConnectionError:
            raise Exception('Could not connect to the website. Please check the URL.')
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response else 'unknown'
            if status_code == 403:
                raise Exception('Access denied (403). The website is blocking automated access. Try copying the job posting text manually.')
            elif status_code == 404:
                raise Exception('Page not found (404). The job posting may have been removed.')
            elif status_code == 429:
                raise Exception('Too many requests (429). Please wait a moment and try again.')
            else:
                raise Exception(f'HTTP error {status_code}. Could not fetch the page.')
        except Exception as e:
            if 'timed out' in str(e).lower() or 'timeout' in str(e).lower():
                raise Exception(f'Request timed out. The website may be slow or blocking automated requests.')
            raise Exception(f'Failed to fetch page: {str(e)}')

    def _clean_soup(self, soup):
        """Remove unwanted tags from the soup."""
        for tag_name in self.REMOVE_TAGS:
            for tag in soup.find_all(tag_name):
                tag.decompose()
        # Remove hidden elements
        for tag in soup.find_all(attrs={'style': re.compile(r'display\s*:\s*none', re.I)}):
            tag.decompose()
        for tag in soup.find_all(attrs={'hidden': True}):
            tag.decompose()
        for tag in soup.find_all(attrs={'aria-hidden': 'true'}):
            tag.decompose()
        return soup

    def _extract_with_selectors(self, soup, selectors):
        """Try to find content using a list of CSS selectors."""
        for selector in selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    # Return the first element that has meaningful text
                    for el in elements:
                        text = el.get_text(separator='\n', strip=True)
                        if len(text) > 50:  # Must have substantial content
                            return text, el
            except Exception:
                continue
        return None, None

    def _extract_metadata_text(self, soup, selectors):
        """Extract short metadata text (title, company, location)."""
        for selector in selectors:
            try:
                elements = soup.select(selector)
                if elements:
                    text = elements[0].get_text(strip=True)
                    if text and len(text) > 1 and len(text) < 200:
                        return text
            except Exception:
                continue
        return None

    def _extract_full_page_text(self, soup):
        """Fallback: extract all meaningful text from the page body."""
        body = soup.find('body')
        if not body:
            body = soup

        # Get all text blocks
        text_blocks = []
        for element in body.find_all(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'td', 'dd']):
            text = element.get_text(strip=True)
            if text and len(text) > 10:
                # Avoid duplicates from nested elements
                if text not in text_blocks:
                    text_blocks.append(text)

        return '\n'.join(text_blocks)

    def _clean_text(self, text):
        """Clean extracted text."""
        if not text:
            return ''

        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'[ \t]{2,}', ' ', text)
        # Remove common cookie/tracking notices
        lines = text.split('\n')
        cleaned_lines = []
        skip_patterns = [
            r'cookie', r'privacy policy', r'terms of (use|service)',
            r'accept all', r'reject all', r'manage preferences',
            r'sign in', r'sign up', r'create account', r'log in',
            r'©\s*\d{4}', r'all rights reserved',
        ]
        for line in lines:
            line = line.strip()
            if not line:
                cleaned_lines.append('')
                continue
            lower_line = line.lower()
            if any(re.search(p, lower_line) for p in skip_patterns) and len(line) < 100:
                continue
            cleaned_lines.append(line)

        text = '\n'.join(cleaned_lines).strip()

        # Truncate if too long (AI has context limits)
        if len(text) > 15000:
            text = text[:15000] + '\n\n[Text truncated...]'

        return text

    def scrape_job_posting(self, url):
        """
        Main method: scrape a job posting from any URL.
        Returns a dict with extracted text and metadata.
        """
        if not self.validate_url(url):
            raise Exception('Invalid URL. Please provide a valid URL starting with http:// or https://')

        domain = self.get_domain(url)

        # Fetch the page
        html = self.fetch_page(url)

        # Parse with BeautifulSoup
        soup = BeautifulSoup(html, 'lxml')

        # Clean the soup
        soup = self._clean_soup(soup)

        # Try to extract job description using known selectors
        job_text, job_element = self._extract_with_selectors(soup, self.JOB_CONTENT_SELECTORS)

        # Extract metadata
        title = self._extract_metadata_text(soup, self.JOB_TITLE_SELECTORS)
        company = self._extract_metadata_text(soup, self.COMPANY_SELECTORS)
        location = self._extract_metadata_text(soup, self.LOCATION_SELECTORS)

        # Build the full text
        parts = []

        # Add metadata if found
        if title:
            parts.append(f"Job Title: {title}")
        if company:
            parts.append(f"Company: {company}")
        if location:
            parts.append(f"Location: {location}")

        if parts:
            parts.append('')  # Empty line separator

        # Add job description
        if job_text and len(job_text) > 100:
            parts.append(job_text)
        else:
            # Fallback: extract full page text
            full_text = self._extract_full_page_text(soup)
            if full_text and len(full_text) > 100:
                parts.append(full_text)
            else:
                raise Exception(
                    'Could not extract meaningful content from this page. '
                    'The website may require JavaScript to load content, or it may be blocking automated access. '
                    'Try copying the job posting text manually.'
                )

        extracted_text = '\n'.join(parts)
        extracted_text = self._clean_text(extracted_text)

        if len(extracted_text.strip()) < 50:
            raise Exception(
                'The extracted content is too short to be a job posting. '
                'The website may require JavaScript to load content. '
                'Try copying the job posting text manually.'
            )

        # Get page title as fallback
        page_title = ''
        title_tag = soup.find('title')
        if title_tag:
            page_title = title_tag.get_text(strip=True)

        return {
            'text': extracted_text,
            'url': url,
            'domain': domain,
            'page_title': page_title,
            'extracted_title': title,
            'extracted_company': company,
            'extracted_location': location,
        }
