import pandas as pd
import numpy as np
from datetime import date, timedelta
import csv
import json

pd.set_option("display.max_rows", None, "display.max_columns", None)
df = pd.read_csv('data/numRegByCity.csv', parse_dates=['REGISTRATION_DATE'], infer_datetime_format=True)
df = df.fillna(0)
pre16 = df[(np.datetime64('1940-01-01') <= df['REGISTRATION_DATE']) & (df['REGISTRATION_DATE'] <= np.datetime64('2016-11-08'))]
post16 = df[(np.datetime64('2016-11-08') < df['REGISTRATION_DATE']) & (df['REGISTRATION_DATE'] <= np.datetime64('2020-10-05'))]
cumulative = pd.DataFrame(pre16.sum(axis=0))
cumulative = cumulative.transpose()
cumulative['REGISTRATION_DATE'] = np.datetime64('2016-11-08')
post16 = post16.append(cumulative, ignore_index=True, sort=True)
post16 = post16.sort_values('REGISTRATION_DATE')  # resort
post16.set_index('REGISTRATION_DATE', inplace=True)
with open('data/ohio_cities.geojson', 'r') as file:
    original_json = json.load(file)

def getCorrectString(inp):
    if inp == "Mentor-On-The-Lake":
        return inp
    splitted = inp.split()
    result = splitted[0].capitalize()
    for word in splitted[1:]:
        result += " " + word.capitalize()
    return result

renameMap = []
for name in list(post16):
    renameMap.append(getCorrectString(name))
post16.columns = renameMap
toKeep = set(list(post16))
toRemove = []

for i in range(len(original_json['features'])):
    original_json['features'][i]['properties']["registrations"] = {}
total_registrants = post16.sum()
for i in range(len(original_json['features'])):
    county = original_json['features'][i]['properties']['name']
    print(county)
    if (county not in toKeep):
        toRemove.append(i)
    else:
        for row in post16.iterrows():
            date = row[0].strftime('%m/%d/%Y')
            original_json['features'][i]["properties"]["registrations"][date] = row[1][county]

        original_json['features'][i]["properties"]["total_registrants"] = total_registrants[county]

for i in toRemove[::-1]:
    del original_json['features'][i]


# print(original_json['features'][0]["properties"])
with open('data/final_data_new_for_city_since_1940.json', 'w') as file:
    json.dump(original_json, file)
