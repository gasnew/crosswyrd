import requests
import os
import json
from concurrent.futures import ThreadPoolExecutor


def extract_clues(data):
    if not data:
        return []
    date = data["date"]
    print(f"extracting clues for date {date}")
    clues = [
        {
            "c": data["data"]["clues"][direction][index].split(". ")[-1],
            "a": data["data"]["answers"][direction][index],
            "d": date,
        }
        for direction in ["across", "down"]
        for index in range(len(data["data"]["clues"][direction]))
    ]
    return clues


def fetch_puzzle_data(year_month_day):
    year, month, day = year_month_day
    response = requests.get(
        f"https://raw.githubusercontent.com/doshea/nyt_crosswords/master/{year}/{month}/{day}.json"
    )
    if response.status_code >= 300:
        return None
    print(f"Fetched data from {year}/{month}/{day}!")
    try:
        return {
            "data": response.json(),
            "date": f"{month}/{day}/{year}",
        }
    except Exception as e:
        return None


def generate_year_month_day(years):
    return [
        (year, f"{month + 1:02d}", f"{day + 1:02d}")
        for year in years
        for month in range(12)
        for day in range(31)
    ]


with ThreadPoolExecutor(max_workers=10) as executor:
    clues = [
        clue
        for data in executor.map(
            fetch_puzzle_data,
            generate_year_month_day([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017]),
            # generate_year_month_day([2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009]),
            # generate_year_month_day([2017]),
        )
        for clue in extract_clues(data)
    ]

print(f"Downloaded {len(clues)} clues total!")

with open("./nyt_clues.json", "w+") as f:
    json.dump(clues, f)
