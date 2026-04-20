#!/usr/bin/env python3
"""
Enrich business emails and social media from web scraping.
"""

import json
import time
import re
import os
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False

DATA_FILE = Path(__file__).parent.parent / "data" / "businesses.json"
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "businesses_enriched.json"

EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
INSTA_REGEX = r'instagram\.com/([a-zA-Z0-9_.-]+)'
FB_REGEX = r'facebook\.com/([a-zA-Z0-9_.-]+)'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def load_data():
    with open(DATA_FILE) as f:
        return json.load(f)

def save_data(data):
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def search_google(query, api_key=None):
    """Search using Google Custom Search API (requires API key)."""
    if not api_key:
        return None
    # Would use Google Custom Search API here
    return None

def scrape_website(url):
    """Scrape a website for email and social links."""
    if not HAS_DEPS:
        return None
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return None
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        text = resp.text
        
        # Find email
        emails = re.findall(EMAIL_REGEX, text)
        email = None
        for e in emails:
            if not any(x in e.lower() for x in ['example', 'test', 'noreply', 'sentry', 'wixpress', 'squarespace']):
                email = e
                break
        
        # Find Instagram
        insta_match = re.search(INSTA_REGEX, text)
        instagram = f"instagram.com/{insta_match.group(1)}" if insta_match else None
        
        # Find Facebook
        fb_match = re.search(FB_REGEX, text)
        facebook = f"facebook.com/{fb_match.group(1)}" if fb_match else None
        
        return {
            'email': email,
            'instagram': instagram,
            'facebook': facebook
        }
    except Exception as e:
        print(f"  Error scraping {url}: {e}")
        return None

def enrich_business(business, api_key=None):
    """Enrich a single business with email/social data."""
    result = {
        'email': business.get('email'),
        'instagram': business.get('instagram'),
        'facebook': business.get('facebook'),
        'emailSource': business.get('emailSource')
    }
    
    # Try website first
    if business.get('website'):
        scraped = scrape_website(business['website'])
        if scraped:
            if scraped.get('email') and not result['email']:
                result['email'] = scraped['email']
                result['emailSource'] = 'website'
            if scraped.get('instagram'):
                result['instagram'] = scraped['instagram']
            if scraped.get('facebook'):
                result['facebook'] = scraped['facebook']
    
    return result

def main():
    if not HAS_DEPS:
        print("Installing dependencies...")
        os.system("pip install requests beautifulsoup4")
        print("Please re-run the script")
        return
    
    data = load_data()
    print(f"Loaded {len(data)} businesses")
    
    # Only process those without email
    to_process = [b for b in data if not b.get('email')]
    print(f"Processing {len(to_process)} businesses without email")
    
    enriched_count = 0
    for i, business in enumerate(to_process):
        if i % 50 == 0:
            print(f"Progress: {i}/{len(to_process)} ({enriched_count} enriched)")
        
        result = enrich_business(business)
        
        # Update business
        if result['email']:
            business['email'] = result['email']
            business['emailSource'] = result['emailSource']
            enriched_count += 1
        if result.get('instagram'):
            business['instagram'] = result['instagram']
        if result.get('facebook'):
            business['facebook'] = result['facebook']
        
        business['emailEnrichmentCheckedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Rate limiting
        time.sleep(0.5)
    
    # Save
    save_data(data)
    print(f"\nDone! Enriched {enriched_count} businesses")
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()