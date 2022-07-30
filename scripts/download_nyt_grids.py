import requests
import os
import json
from concurrent.futures import ThreadPoolExecutor


def extract_grid(data):
    if not data:
        return None
    grid = data["data"]["grid"]
    date = data["date"]
    print(f"extracting grid of length {len(grid)}")
    return {"grid": ["." if tile == "." else "0" for tile in grid], "date": date}


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
    grids = [
        extract_grid(data)
        for data in executor.map(
            fetch_puzzle_data,
            generate_year_month_day([
                2010, 2011, 2012, 2013, 2014, 2015, 2016,
                2017
            ]),
        )
    ]

filtered_grids = [grid for grid in grids if grid and len(grid["grid"]) == 225]
print(f"{len(grids)} grids total ({len(filtered_grids)} after filtering).")

with open("./nyt_grids.json", "w+") as f:
    json.dump(filtered_grids, f)
