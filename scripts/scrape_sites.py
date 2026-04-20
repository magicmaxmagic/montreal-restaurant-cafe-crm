#!/usr/bin/env python3
"""Simple website email scraper."""
import json
import re
import requests
from bs4 import BeautifulSoup
import time
from pathlib import Path

DATA_FILE = Path(__file__).parent.parent / "data" / "businesses.json"
EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
BANNED = ['example', 'test', 'noreply', 'sentry', 'wixpress', 'squarespace', 'mailchimp', 'yelp', 'doordash', 'ubereats']

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def get_email(text):
    for e in re.findall(EMAIL_REGEX, text):
        if not any(x in e.lower() for x in BANNED):
            return e.lower()
    return None

def main():
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    with_site = [b for b in data if b.get('website') and not b.get('email')]
    print(f"Scraping {len(with_site)} websites...")
    
    for i, b in enumerate(with_site):
        if i % 20 == 0:
            print(f"Progress: {i}/{len(with_site)}")
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        try:
            r = requests.get(b['website'], headers=headers, timeout=15)
            email = get_email(r.text)
            if email:
                b['email'] = email
                b['emailSource'] = 'website'
                print(f"  ✓ {b['name']}: {email}")
            
            # Instagram/Facebook
            if 'instagram.com/' in r.text:
                m = re.search(r'instagram\.com/([a-zA-Z0-9_.-]+)', r.text)
                if m:
                    b['instagram'] = f"https://instagram.com/{m.group(1)}"
            if 'facebook.com/' in r.text:
                m = re.search(r'facebook\.com/([a-zA-Z0-9_.-]+)', r.text)
                if m:
                    b['facebook'] = f"https://facebook.com/{m.group(1)}"
            
            time.sleep(0.5)
        except Exception as e:
            print(f"  ✗ {b['name']}: {e}")
    
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Done!")

if __name__ == '__main__':
    main()