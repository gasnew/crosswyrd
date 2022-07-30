import requests
import os
import json
from concurrent.futures import ThreadPoolExecutor

def extract_words(data):
    if not data:
        return []
    return data['answers']['across'] +data['answers']['down']

def fetch_puzzle_data(year_month_day):
    year, month, day = year_month_day
    response = requests.get(f'https://raw.githubusercontent.com/doshea/nyt_crosswords/master/{year}/{month}/{day}.json')
    if response.status_code >= 300:
        return None
    print(f'Fetched data from {year}/{month}/{day}!')
    try:
        return response.json()
    except Exception:
        return None

def generate_year_month_day(years):
    return [
        (year, f"{month + 1:02d}", f"{day + 1:02d}")
        for year in years
        for month in range(12)
        for day in range(31)
    ]


with ThreadPoolExecutor(max_workers=10) as executor:
    words = [
        word
        for data in executor.map(fetch_puzzle_data, generate_year_month_day([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]))
        for word in extract_words(data)
    ]

uniq_words = list(set(words))
print(f'{len(words)} words total, {len(uniq_words)} unique.')

with open('./nyt_words.json', 'w+') as f:
    json.dump(uniq_words, f)
