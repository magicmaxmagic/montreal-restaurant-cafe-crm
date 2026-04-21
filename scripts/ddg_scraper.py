#!/usr/bin/env python3
"""DuckDuckGo email scraper with better filtering."""
import json
import re
import requests
import time
import sys
from pathlib import Path
from urllib.parse import quote

DATA_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/data/businesses.json")
EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
BANNED_DOMAINS = ['duckduckgo', 'google', 'youtube', 'facebook', 'instagram', 'twitter', 'linkedin', 'yelp', 'tripadvisor', 'doordash', 'ubereats', 'skipthedishes', 'gmail', 'hotmail', 'yahoo', 'outlook', 'example', 'test']

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'text/html',
}

def is_valid_email(email):
    domain = email.split('@')[1].lower()
    if any(b in domain for b in BANNED_DOMAINS):
        return False
    if email.startswith('error') or email.startswith('noreply'):
        return False
    return True

def get_email(text):
    for e in re.findall(EMAIL_REGEX, text):
        if is_valid_email(e):
            return e.lower()
    return None

def main():
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    to_process = [(i, b) for i, b in enumerate(data) if not b.get('email')]
    print(f"Processing {len(to_process)} restaurants...", flush=True)
    
    found = 0
    for count, (idx, b) in enumerate(to_process[:200]):
        name = b.get('name', '')
        address = b.get('address', '')
        
        print(f"[{count+1}] {name[:50]}", flush=True)
        
        try:
            # Search for restaurant website
            query = quote(f'"{name}" montreal restaurant')
            url = f"https://duckduckgo.com/html/?q={query}"
            
            r = requests.get(url, headers=headers, timeout=15)
            
            # Find website links
            import re as regex
            links = regex.findall(r'href="([^"]*)"[^>]*class="[^"]*result__a[^"]*"', r.text)
            
            # Try to visit first website result
            if links:
                for link in links[:2]:
                    if 'duckduckgo.com' not in link.lower():
                        try:
                            wr = requests.get(link, headers=headers, timeout=10)
                            email = get_email(wr.text)
                            if email:
                                data[idx]['email'] = email
                                data[idx]['emailSource'] = 'website_search'
                                data[idx]['website'] = link
                                found += 1
                                print(f"  ✓ {email} (from {link[:40]})", flush=True)
                                break
                        except:
                            continue
                else:
                    print(f"  ✗ No email on websites", flush=True)
            else:
                # Try to find email directly in search results
                email = get_email(r.text)
                if email:
                    data[idx]['email'] = email
                    data[idx]['emailSource'] = 'duckduckgo'
                    found += 1
                    print(f"  ✓ {email}", flush=True)
                else:
                    print(f"  ✗ No email", flush=True)
            
        except Exception as e:
            print(f"  ✗ Error: {str(e)[:50]}", flush=True)
        
        if count % 20 == 0:
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        time.sleep(2)
    
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nDone! Found {found} emails", flush=True)

if __name__ == '__main__':
    main()