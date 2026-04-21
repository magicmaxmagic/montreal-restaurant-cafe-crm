#!/usr/bin/env python3
"""Yelp Fusion API + website email scraper - with notification."""
import json
import requests
import time
import re
import subprocess
from pathlib import Path

DATA_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/data/businesses.json")
KEY_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/.yelp_api_key")

EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
BANNED = ['wixpress', 'squarespace', 'mailchimp', 'yelp', 'doordash', 'ubereats', 'skipthedishes', 'example', 'test', 'noreply', 'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'facebook.com', 'instagram.com', 'sentry.io', 'sentry']

YELP_API_KEY = KEY_FILE.read_text().strip() if KEY_FILE.exists() else None

headers_web = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def get_email(text):
    for e in re.findall(EMAIL_REGEX, text):
        if not any(x in e.lower() for x in BANNED):
            return e.lower()
    return None

def scrape_website(url):
    try:
        r = requests.get(url, headers=headers_web, timeout=10)
        email = get_email(r.text)
        insta = re.search(r'instagram\.com/([a-zA-Z0-9_.-]+)', r.text)
        fb = re.search(r'facebook\.com/([a-zA-Z0-9_.-]+)', r.text)
        return {
            'email': email,
            'instagram': f"https://instagram.com/{insta.group(1)}" if insta else None,
            'facebook': f"https://facebook.com/{fb.group(1)}" if fb else None
        }
    except:
        return None

def search_yelp(name, location, api_key):
    headers = {'Authorization': f'Bearer {api_key}', 'Accept': 'application/json'}
    params = {'term': name, 'location': location, 'limit': 1}
    try:
        r = requests.get('https://api.yelp.com/v3/businesses/search', headers=headers, params=params, timeout=10)
        if r.status_code == 200:
            businesses = r.json().get('businesses', [])
            return businesses[0] if businesses else None
        elif r.status_code == 429:
            print("Rate limited, waiting 60s...", flush=True)
            time.sleep(60)
    except:
        pass
    return None

def main():
    if not YELP_API_KEY:
        print("ERROR: No API key!", flush=True)
        return
    
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    to_process = [(i, b) for i, b in enumerate(data)]
    
    print(f"Processing {len(to_process)} restaurants...", flush=True)
    
    emails_found = 0
    phones_added = 0
    yelp_matches = 0
    
    for count, (idx, b) in enumerate(to_process):
        if count % 50 == 0:
            print(f"[{count}/{len(to_process)}] Emails: +{emails_found}, Phones: +{phones_added}, Yelp: {yelp_matches}", flush=True)
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        name = b.get('name', '')
        address = b.get('address', '')
        location = f"{address}, Montreal, QC" if address else "Montreal, QC"
        
        if b.get('email') and b.get('phone'):
            continue
        
        result = search_yelp(name, location, YELP_API_KEY)
        
        if result:
            yelp_matches += 1
            if result.get('phone') and not b.get('phone'):
                data[idx]['phone'] = result['phone']
                phones_added += 1
            if result.get('url'):
                data[idx]['yelp_url'] = result['url']
            if result.get('image_url') and not b.get('image'):
                data[idx]['image'] = result['image_url']
            if result.get('coordinates'):
                if not b.get('latitude'):
                    data[idx]['latitude'] = result['coordinates'].get('latitude')
                    data[idx]['longitude'] = result['coordinates'].get('longitude')
        
        if b.get('website') and not b.get('email'):
            scraped = scrape_website(b['website'])
            if scraped and scraped.get('email'):
                data[idx]['email'] = scraped['email']
                data[idx]['emailSource'] = 'website'
                emails_found += 1
            if scraped:
                if scraped.get('instagram') and not b.get('instagram'):
                    data[idx]['instagram'] = scraped['instagram']
                if scraped.get('facebook') and not b.get('facebook'):
                    data[idx]['facebook'] = scraped['facebook']
        
        time.sleep(0.1)
    
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    final_emails = sum(1 for b in data if b.get('email'))
    final_phones = sum(1 for b in data if b.get('phone'))
    print(f"\n=== DONE ===", flush=True)
    print(f"Emails: {final_emails}", flush=True)
    print(f"Phones: {final_phones}", flush=True)
    print(f"Yelp matches: {yelp_matches}", flush=True)
    
    # Notify via OpenClaw
    subprocess.run(['openclaw', 'system', 'event', '--text', f'Done: Yelp scraping complete. Emails: {final_emails}, Phones: {final_phones}', '--mode', 'now'], capture_output=True)

if __name__ == '__main__':
    main()