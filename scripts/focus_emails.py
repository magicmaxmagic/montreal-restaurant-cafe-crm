#!/usr/bin/env python3
"""Focus: scrape emails from websites only."""
import json
import requests
import re
import time
from pathlib import Path

DATA_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/data/businesses.json")
EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
BANNED = ['wixpress', 'squarespace', 'mailchimp', 'yelp', 'doordash', 'ubereats', 'skipthedishes', 'example', 'test', 'noreply', 'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'facebook.com', 'instagram.com', 'sentry.io', 'sentry', 'noreply', 'no-reply', 'abuse', 'webmaster', 'info@info', 'contact@contact']

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

def get_email(text):
    for e in re.findall(EMAIL_REGEX, text):
        email = e.lower()
        # Filter obvious non-business emails
        if any(x in email for x in BANNED):
            continue
        # Filter suspicious patterns
        local, domain = email.split('@')
        if len(local) < 2 or len(domain.split('.'))[-1] < 2:
            continue
        return email
    return None

def main():
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    # Only restaurants with website but no email
    to_process = [(i, b) for i, b in enumerate(data) if b.get('website') and not b.get('email')]
    
    print(f"Scraping {len(to_process)} websites for emails...", flush=True)
    
    found = 0
    for count, (idx, b) in enumerate(to_process):
        if count % 20 == 0:
            print(f"[{count}/{len(to_process)}] Found: {found}", flush=True)
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        try:
            r = requests.get(b['website'], headers=headers, timeout=10)
            email = get_email(r.text)
            if email:
                data[idx]['email'] = email
                data[idx]['emailSource'] = 'website'
                found += 1
                print(f"  ✓ {b['name'][:40]}: {email}", flush=True)
        except:
            pass
        
        time.sleep(0.3)
    
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    final = sum(1 for b in data if b.get('email'))
    print(f"\n=== DONE ===", flush=True)
    print(f"Total emails: {final}", flush=True)
    print(f"New emails found: {found}", flush=True)

if __name__ == '__main__':
    main()