#!/usr/bin/env python3
"""Fast website email re-scraping."""
import json
import re
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from pathlib import Path

DATA_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/data/businesses.json")
EMAIL_REGEX = r'mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|[\s"\']([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})[\s"\'>]'
BANNED = ['wixpress', 'squarespace', 'mailchimp', 'yelp', 'doordash', 'ubereats', 'skipthedishes', 'example', 'test', 'noreply']

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def scrape_site(b):
    try:
        r = requests.get(b['website'], headers=headers, timeout=8)
        
        # Find all emails
        emails = re.findall(EMAIL_REGEX, r.text)
        for e in emails:
            email = e[0] if e[0] else e[1]
            if email and not any(x in email.lower() for x in BANNED):
                b['email'] = email.lower()
                b['emailSource'] = 'website'
                return b
        
        # Try simple regex
        for e in re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', r.text):
            if not any(x in e.lower() for x in BANNED):
                b['email'] = e.lower()
                b['emailSource'] = 'website'
                return b
    except:
        pass
    return b

def main():
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    to_scrape = [b for b in data if b.get('website') and not b.get('email')]
    print(f"Scraping {len(to_scrape)} websites with ThreadPool...")
    
    done = 0
    start = time.time()
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(scrape_site, b): i for i, b in enumerate(to_scrape)}
        for future in as_completed(futures):
            idx = futures[future]
            try:
                result = future.result()
                if result.get('email'):
                    # Find original index in data
                    for i, b in enumerate(data):
                        if b.get('id') == result.get('id'):
                            data[i] = result
                            done += 1
                            break
            except:
                pass
            
            if done % 10 == 0 and done > 0:
                print(f"  Found {done} emails")
    
    # Save
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    final = sum(1 for b in data if b.get('email'))
    print(f"Done! Total emails: {final} (new: {done})")

if __name__ == '__main__':
    main()