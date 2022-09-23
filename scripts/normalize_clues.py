from datetime import datetime
import os
import json


DATE_FORMAT = "%m/%d/%Y"


def parse_date(date):
    return datetime.strptime(date, DATE_FORMAT)


def date_str(date):
    return date.strftime(DATE_FORMAT)


def merge_entries(entry1, entry2):
    return {
        "last_seen": (
            entry1["last_seen"]
            if parse_date(entry1["last_seen"]) > parse_date(entry2["last_seen"])
            else entry2["last_seen"]
        ),
        "times_seen": entry1["times_seen"] + entry2["times_seen"],
    }


with open("./nyt_clues.json", "r") as f:
    data = json.load(f)


with open("./nyt_clues_norm.json", "w+") as f:
    new_data = {}
    for clue in data:
        entry = {
            "last_seen": clue["d"],
            "times_seen": 1,
        }
        if clue["a"] in new_data:
            word_data = new_data[clue["a"]]
            if clue["c"] in word_data:
                word_data[clue["c"]] = merge_entries(word_data[clue["c"]], entry)
            else:
                word_data[clue["c"]] = entry
        else:
            new_data[clue["a"]] = {clue["c"]: entry}

    json.dump(new_data, f)
