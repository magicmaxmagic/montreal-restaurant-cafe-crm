#!/usr/bin/env python3
"""Fast website email scraper with proper saving."""
import json
import re
import requests
import time
from pathlib import Path

DATA_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/data/businesses.json")
EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
BANNED = ['example', 'test', 'noreply', 'sentry', 'wixpress', 'squarespace', 'mailchimp', 'yelp', 'doordash', 'ubereats']

headers = {'User-Agent': 'Mozilla/5.0'}

def get_email(text):
    for e in re.findall(EMAIL_REGEX, text):
        if not any(x in e.lower() for x in BANNED):
            return e.lower()
    return None

def main():
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    to_scrape = [(i, b) for i, b in enumerate(data) if b.get('website') and not b.get('email')]
    print(f"Scraping {len(to_scrape)} sites...")
    
    for count, (idx, b) in enumerate(to_scrape):
        try:
            r = requests.get(b['website'], headers=headers, timeout=10)
            email = get_email(r.text)
            if email:
                data[idx]['email'] = email
                data[idx]['emailSource'] = 'website'
            
            m = re.search(r'instagram\.com/([a-zA-Z0-9_.-]+)', r.text)
            if m:
                data[idx]['instagram'] = f"https://instagram.com/{m.group(1)}"
            
            m = re.search(r'facebook\.com/([a-zA-Z0-9_.-]+)', r.text)
            if m:
                data[idx]['facebook'] = f"https://facebook.com/{m.group(1)}"
        except:
            pass
        
        if count % 20 == 0:
            print(f"  {count}/{len(to_scrape)}")
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
    
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    final = sum(1 for b in data if b.get('email'))
    print(f"Done! Total emails: {final}")

if __name__ == '__main__':
    main()