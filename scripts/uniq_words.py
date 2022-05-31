import os
import json

with open('./nyt_words.json', 'r') as f:
    data = json.load(f)


with open('./nyt_words_uniq.json', 'w+') as f:
    new_data = list(set(data))
    print(len(data), len(new_data))
    json.dump(new_data, f)
