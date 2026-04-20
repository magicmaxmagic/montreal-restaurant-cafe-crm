#!/usr/bin/env python3
"""
Multi-source email/social scraper for Montreal restaurants.
"""

import json
import re
import time
import asyncio
import aiohttp
from pathlib import Path
from urllib.parse import quote, urlparse
from bs4 import BeautifulSoup
import random

DATA_FILE = Path(__file__).parent.parent / "data" / "businesses.json"

EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
INSTA_REGEX = r'instagram\.com/([a-zA-Z0-9_.-]+)'
FB_REGEX = r'facebook\.com/([a-zA-Z0-9_.-]+)'

BANNED_EMAILS = ['example', 'test', 'noreply', 'sentry', 'wixpress', 'squarespace',
                 'mailchimp', 'klaviyo', 'yelp', 'tripadvisor', 'doordash', 'ubereats']

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

def random_headers():
    return {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
    }

def clean_email(email):
    if not email:
        return None
    email = email.lower().strip()
    if any(x in email for x in BANNED_EMAILS):
        return None
    if email.endswith(('.png', '.jpg', '.gif', '.webp')):
        return None
    return email

def extract_emails(text):
    emails = re.findall(EMAIL_REGEX, text)
    for e in emails:
        cleaned = clean_email(e)
        if cleaned:
            return cleaned
    return None

def extract_social(text, url):
    insta = re.search(INSTA_REGEX, text)
    fb = re.search(FB_REGEX, text)
    return {
        'instagram': f"https://instagram.com/{insta.group(1)}" if insta else None,
        'facebook': f"https://facebook.com/{fb.group(1)}" if fb else None,
    }

async def fetch(session, url, timeout=10):
    try:
        async with session.get(url, headers=random_headers(), timeout=aiohttp.ClientTimeout(total=timeout), ssl=False) as resp:
            if resp.status == 200:
                return await resp.text()
    except Exception:
        pass
    return None

async def scrape_business(session, business):
    """Scrape a single business from multiple sources."""
    result = {'email': None, 'instagram': None, 'facebook': None, 'emailSource': None}
    
    # 1. Try their website
    if business.get('website'):
        html = await fetch(session, business['website'])
        if html:
            result['email'] = extract_emails(html)
            if result['email']:
                result['emailSource'] = 'website'
            social = extract_social(html, business['website'])
            result['instagram'] = social['instagram']
            result['facebook'] = social['facebook']
    
    # 2. If no email, try Google search
    if not result['email']:
        name = business.get('name', '')
        query = quote(f"{name} montreal restaurant contact email")
        google_url = f"https://www.google.com/search?q={query}"
        html = await fetch(session, google_url)
        if html:
            result['email'] = extract_emails(html)
            if result['email']:
                result['emailSource'] = 'google'
            social = extract_social(html, google_url)
            if not result['instagram']:
                result['instagram'] = social['instagram']
            if not result['facebook']:
                result['facebook'] = social['facebook']
    
    # 3. Try Yelp
    if not result['email']:
        name = business.get('name', '')
        query = quote(f"{name} montreal")
        yelp_url = f"https://www.yelp.com/search?find_desc={query}&find_loc=Montreal%2C+QC"
        html = await fetch(session, yelp_url)
        if html:
            result['email'] = extract_emails(html)
            if result['email']:
                result['emailSource'] = 'yelp'
    
    return result

async def main(batch_size=50, start_from=0):
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    # Filter businesses without email
    to_process = [(i, b) for i, b in enumerate(data) if not b.get('email')]
    print(f"Total: {len(data)}, To enrich: {len(to_process)}")
    
    # Process in batches
    batch = to_process[start_from:start_from + batch_size]
    print(f"Processing batch {start_from}-{start_from + len(batch)}")
    
    connector = aiohttp.TCPConnector(limit=10)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [scrape_business(session, b) for idx, b in batch]
        results = await asyncio.gather(*tasks)
    
    # Update data
    enriched = 0
    for (idx, business), result in zip(batch, results):
        if result['email']:
            business['email'] = result['email']
            business['emailSource'] = result['emailSource']
            enriched += 1
        if result['instagram']:
            business['instagram'] = result['instagram']
        if result['facebook']:
            business['facebook'] = result['facebook']
        business['emailEnrichmentCheckedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    # Save
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Enriched: {enriched}/{len(batch)}")
    return enriched, len(batch)

if __name__ == '__main__':
    import sys
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    asyncio.run(main(start_from=start))