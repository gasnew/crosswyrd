import requests
import os
import json
from concurrent.futures import ThreadPoolExecutor


def get(l, i):
    if i < 0:
        return None
    try:
        return l[i]
    except (TypeError, IndexError):
        return None


def chunks(lst, n):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def count_words(grid):
    solid = lambda tile: tile is None or tile == "."

    tiles = list(chunks(grid["grid"], 15))
    word_count = 0
    for (row_index, row) in enumerate(tiles):
        for (column_index, tile) in enumerate(row):
            if solid(tile):
                continue
            left_tile = get(get(tiles, row_index), column_index - 1)
            above_tile = get(get(tiles, row_index - 1), column_index)
            if solid(left_tile):
                word_count += 1
            if solid(above_tile):
                word_count += 1
    return word_count


def passes_checks(grid):
    # https://www.nytimes.com/article/submit-crossword-puzzles-the-new-york-times.html
    return 70 <= count_words(grid) <= 78


with open("./grids.json", "r") as f:
    grids = json.load(f)


filtered_grids = [grid for grid in grids if passes_checks(grid)]
print(f"{len(grids)} grids total ({len(filtered_grids)} after filtering).")
# print([count_words(grid) for grid in filtered_grids])


with open("./filtered_grids.json", "w+") as f:
    json.dump(filtered_grids, f)
