#!/usr/bin/env python3
"""Google Maps email scraper using search."""
import json
import re
import requests
import time
from pathlib import Path
from urllib.parse import quote
from bs4 import BeautifulSoup

DATA_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/data/businesses.json")
EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
BANNED = ['example', 'test', 'noreply', 'sentry', 'wixpress', 'squarespace', 'mailchimp', 'yelp', 'doordash', 'ubereats', 'skipthedishes', 'gmail', 'hotmail', 'yahoo', 'outlook', 'google.com']

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-CA,en;q=0.9,fr-CA;q=0.8,fr;q=0.7',
}

def get_email(text):
    for e in re.findall(EMAIL_REGEX, text):
        if not any(x in e.lower() for x in BANNED):
            return e.lower()
    return None

def search_google_maps(name, address):
    """Search Google Maps for restaurant contact."""
    try:
        query = quote(f"{name} {address} montreal")
        url = f"https://www.google.com/search?q={query}"
        
        r = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Look for website link
        website = None
        for a in soup.find_all('a'):
            href = a.get('href', '')
            if 'website' in a.text.lower() or 'site web' in a.text.lower():
                # Extract actual URL from Google redirect
                match = re.search(r'url\?q=([^&]+)', href)
                if match:
                    website = match.group(1)
                break
        
        # Also try to find website in the page content
        if not website:
            for span in soup.find_all('span'):
                if span.text and '.' in span.text and not span.text.startswith('http'):
                    potential = span.text.strip()
                    if any(tld in potential for tld in ['.com', '.ca', '.net', '.org']):
                        website = f"https://{potential}" if not potential.startswith('http') else potential
                        break
        
        # If we found a website, scrape it for email
        if website:
            try:
                wr = requests.get(website, headers=headers, timeout=10)
                email = get_email(wr.text)
                
                # Also find social
                insta = re.search(r'instagram\.com/([a-zA-Z0-9_.-]+)', wr.text)
                fb = re.search(r'facebook\.com/([a-zA-Z0-9_.-]+)', wr.text)
                
                return {
                    'email': email,
                    'website': website,
                    'instagram': f"https://instagram.com/{insta.group(1)}" if insta else None,
                    'facebook': f"https://facebook.com/{fb.group(1)}" if fb else None,
                    'source': 'google_maps'
                }
            except:
                pass
        
        # Try to find email directly in Google search results
        email = get_email(r.text)
        if email:
            return {'email': email, 'source': 'google_search'}
        
        return None
    except Exception as e:
        print(f"    Error: {e}")
        return None

def main():
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    # Restaurants without email
    to_process = [(i, b) for i, b in enumerate(data) if not b.get('email')]
    
    print(f"Processing {len(to_process)} restaurants via Google Maps...")
    
    found = 0
    for count, (idx, b) in enumerate(to_process):
        if count % 5 == 0:
            print(f"  {count}/{len(to_process)} (found: {found})")
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        name = b.get('name', '')
        address = b.get('address', '')
        
        print(f"  [{count+1}/{len(to_process)}] {name[:40]}")
        
        result = search_google_maps(name, address)
        if result:
            if result.get('email'):
                data[idx]['email'] = result['email']
                data[idx]['emailSource'] = result.get('source', 'google_maps')
                found += 1
                print(f"    ✓ Email: {result['email']}")
            if result.get('website') and not b.get('website'):
                data[idx]['website'] = result['website']
                print(f"    ✓ Website: {result['website']}")
            if result.get('instagram'):
                data[idx]['instagram'] = result['instagram']
            if result.get('facebook'):
                data[idx]['facebook'] = result['facebook']
        
        # Rate limiting
        time.sleep(2)
    
    # Final save
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    final = sum(1 for b in data if b.get('email'))
    print(f"\nDone! Total emails: {final} (new: {found})")

if __name__ == '__main__':
    main()