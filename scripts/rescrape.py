#!/usr/bin/env python3
"""Simple sequential website scraper with save."""
import json
import re
import requests
import time
from pathlib import Path

DATA_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/data/businesses.json")
BANNED = ['wixpress', 'squarespace', 'mailchimp', 'yelp', 'doordash', 'ubereats', 'skipthedishes', 'example', 'test', 'noreply', 'gmail.com', 'hotmail.com', 'yahoo.com']

headers = {'User-Agent': 'Mozilla/5.0'}

def get_email(text):
    # Try mailto links first
    for e in re.findall(r'mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', text):
        if not any(x in e.lower() for x in BANNED):
            return e.lower()
    # Then general emails
    for e in re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text):
        if not any(x in e.lower() for x in BANNED):
            return e.lower()
    return None

def main():
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    to_scrape = [(i, b) for i, b in enumerate(data) if b.get('website') and not b.get('email')]
    print(f"Scraping {len(to_scrape)} websites...")
    
    found = 0
    for count, (idx, b) in enumerate(to_scrape):
        try:
            r = requests.get(b['website'], headers=headers, timeout=10)
            email = get_email(r.text)
            if email:
                data[idx]['email'] = email
                data[idx]['emailSource'] = 'website'
                found += 1
                print(f"  [{count+1}/{len(to_scrape)}] {b['name'][:35]}: {email}")
        except:
            pass
        
        if count % 20 == 0:
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"  Saved progress: {count}/{len(to_scrape)}")
    
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    final = sum(1 for b in data if b.get('email'))
    print(f"Done! Total: {final} emails (new: {found})")

if __name__ == '__main__':
    main()