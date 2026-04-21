#!/usr/bin/env python3
"""Yelp Fusion API scraper - corrected version."""
import json
import requests
import time
import sys
from pathlib import Path

DATA_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/data/businesses.json")
KEY_FILE = Path("/home/maxence/montreal-restaurant-cafe-crm/.yelp_api_key")

# Load API key
YELP_API_KEY = KEY_FILE.read_text().strip() if KEY_FILE.exists() else None

def search_yelp(name, location, api_key):
    """Search Yelp for a business."""
    headers = {'Authorization': f'Bearer {api_key}', 'Accept': 'application/json'}
    params = {'term': name, 'location': location, 'limit': 1}
    
    try:
        r = requests.get('https://api.yelp.com/v3/businesses/search', 
                        headers=headers, params=params, timeout=10)
        if r.status_code == 200:
            businesses = r.json().get('businesses', [])
            return businesses[0] if businesses else None
        elif r.status_code == 429:
            print("  Rate limited, waiting 60s...", flush=True)
            time.sleep(60)
            return None
    except Exception as e:
        print(f"  Error: {e}", flush=True)
    return None

def main():
    if not YELP_API_KEY:
        print("ERROR: No API key found!", flush=True)
        return
    
    print(f"API Key loaded: {YELP_API_KEY[:20]}...", flush=True)
    
    with open(DATA_FILE) as f:
        data = json.load(f)
    
    # Process restaurants without email or without phone
    to_process = [(i, b) for i, b in enumerate(data) 
                  if not b.get('email') or not b.get('phone')]
    
    print(f"Processing {len(to_process)} restaurants...", flush=True)
    
    found = 0
    phones_added = 0
    
    for count, (idx, b) in enumerate(to_process):
        if count % 10 == 0:
            print(f"[{count}/{len(to_process)}] Found: {found}, Phones: {phones_added}", flush=True)
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        
        name = b.get('name', '')
        address = b.get('address', '')
        location = f"{address}, Montreal, QC" if address else "Montreal, QC"
        
        result = search_yelp(name, location, YELP_API_KEY)
        
        if result:
            # Add phone if missing
            if result.get('phone') and not b.get('phone'):
                data[idx]['phone'] = result['phone']
                phones_added += 1
            
            # Add Yelp URL
            if result.get('url'):
                data[idx]['yelp_url'] = result['url']
            
            # Add image if missing
            if result.get('image_url') and not b.get('image'):
                data[idx]['image'] = result['image_url']
            
            # Add categories
            if result.get('categories'):
                cats = [c.get('title') for c in result['categories']]
                if not b.get('yelp_categories'):
                    data[idx]['yelp_categories'] = cats
            
            # Add coordinates if missing
            if result.get('coordinates') and not b.get('latitude'):
                data[idx]['latitude'] = result['coordinates'].get('latitude')
                data[idx]['longitude'] = result['coordinates'].get('longitude')
            
            found += 1
        
        time.sleep(0.1)  # Rate limiting
    
    # Final save
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nDone! Yelp matches: {found}, Phones added: {phones_added}", flush=True)

if __name__ == '__main__':
    main()