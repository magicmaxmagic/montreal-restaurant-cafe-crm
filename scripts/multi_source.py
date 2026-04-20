#!/usr/bin/env python3
"""Multi-source email finder for restaurants without websites."""
import json
import re
import requests
import time
from pathlib import Path
from urllib.parse import quote

DATA_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/data/businesses.json")
EMAIL_REGEX = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
BANNED = ['example', 'test', 'noreply', 'sentry', 'wixpress', 'squarespace', 'mailchimp', 'yelp', 'doordash', 'ubereats', 'skipthedishes']

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def get_email(text):
    for e in re.findall(EMAIL_REGEX, text):
        if not any(x in e.lower() for x in BANNED):
            return e.lower()
    return None

def search_yelp(name, borough):
    """Search Yelp for restaurant."""
    try:
        query = quote(f"{name} montreal {borough}")
        url = f"https://www.yelp.com/search?find_desc={query}&find_loc=Montreal%2C+QC"
        r = requests.get(url, headers=headers, timeout=10)
        
        # Find business page link
        match = re.search(r'href="(/biz/[^"]+)"', r.text)
        if match:
            biz_url = f"https://www.yelp.com{match.group(1).split('?')[0]}"
            biz_r = requests.get(biz_url, headers=headers, timeout=10)
            email = get_email(biz_r.text)
            
            # Instagram/Facebook
            insta = re.search(r'instagram\.com/([a-zA-Z0-9_.-]+)', biz_r.text)
            fb = re.search(r'facebook\.com/([a-zA-Z0-9_.-]+)', biz_r.text)
            
            return {
                'email': email,
                'instagram': f"https://instagram.com/{insta.group(1)}" if insta else None,
                'facebook': f"https://facebook.com/{fb.group(1)}" if fb else None,
                'source': 'yelp'
            }
    except Exception as e:
        print(f"    Yelp error: {e}")
    return None

def search_tripadvisor(name, borough):
    """Search TripAdvisor for restaurant."""
    try:
        query = quote(f"{name} montreal {borough}")
        url = f"https://www.tripadvisor.com/Search?q={query}&searchNear=true"
        r = requests.get(url, headers=headers, timeout=10)
        
        email = get_email(r.text)
        if email:
            return {'email': email, 'source': 'tripadvisor'}
    except Exception as e:
        print(f"    TripAdvisor error: {e}")
    return None

def search_google_maps(name, address):
    """Search Google Maps via embed (free, no API key needed)."""
    try:
        query = quote(f"{name} {address}")
        url = f"https://www.google.com/maps/search/{query}"
        r = requests.get(url, headers=headers, timeout=10)
        
        email = get_email(r.text)
        if email:
            return {'email': email, 'source': 'google_maps'}
    except Exception as e:
        print(f"    Google Maps error: {e}")
    return None

def main():
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    # Restaurants without website AND without email
    to_process = [(i, b) for i, b in enumerate(data) 
                  if not b.get('website') and not b.get('email')]
    
    print(f"Processing {len(to_process)} restaurants without website...")
    
    found = 0
    for count, (idx, b) in enumerate(to_process):
        if count % 10 == 0:
            print(f"  {count}/{len(to_process)} (found: {found})")
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        name = b.get('name', '')
        borough = b.get('borough', '')
        address = b.get('address', '')
        
        print(f"  Searching: {name[:40]}")
        
        # Try Yelp first
        result = search_yelp(name, borough)
        if result and result.get('email'):
            data[idx]['email'] = result['email']
            data[idx]['emailSource'] = result['source']
            if result.get('instagram'):
                data[idx]['instagram'] = result['instagram']
            if result.get('facebook'):
                data[idx]['facebook'] = result['facebook']
            found += 1
            print(f"    ✓ Found via Yelp: {result['email']}")
            time.sleep(2)
            continue
        
        # Try TripAdvisor
        result = search_tripadvisor(name, borough)
        if result and result.get('email'):
            data[idx]['email'] = result['email']
            data[idx]['emailSource'] = result['source']
            found += 1
            print(f"    ✓ Found via TripAdvisor: {result['email']}")
            time.sleep(2)
            continue
        
        time.sleep(1)
    
    # Final save
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    final = sum(1 for b in data if b.get('email'))
    print(f"\nDone! Total emails: {final} (new: {found})")

if __name__ == '__main__':
    main()