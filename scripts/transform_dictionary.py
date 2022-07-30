import os
import json

with open('./dictionary.json', 'r') as f:
    data = json.load(f)


with open('./simple_dict.json', 'w+') as f:
    new_data = [word for word in data]
    print(len(new_data))
    json.dump(new_data, f)
