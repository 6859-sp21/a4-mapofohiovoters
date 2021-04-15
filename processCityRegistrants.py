import pandas as pd
import numpy as np
from datetime import date, timedelta
import csv
import json

df = pd.read_csv('data/numRegByCounty.csv', parse_dates=['REGISTRATION_DATE'], infer_datetime_format=True)
df = df.fillna(0)
pre16 = df[(df['REGISTRATION_DATE'] <= np.datetime64('2016-11-08'))]
post16 = df[(np.datetime64('2016-11-08') < df['REGISTRATION_DATE']) & (df['REGISTRATION_DATE'] <= np.datetime64('2020-10-05'))]
cumulative = pd.DataFrame(pre16.sum(axis=0))
cumulative = cumulative.transpose()
cumulative['REGISTRATION_DATE'] = np.datetime64('2016-11-08')
post16 = post16.append(cumulative, ignore_index=True, sort=True)
post16 = post16.sort_values('REGISTRATION_DATE')  # resort
post16.set_index('REGISTRATION_DATE', inplace=True)
with open('data/final_data.json', 'r') as file:
    original_json = json.load(file)

for i in range(len(original_json['features'])):
    original_json['features'][i]['properties']["registrations"] = {}
total_registrants = post16.sum()
for i in range(len(original_json['features'])):
    county = original_json['features'][i]['properties']['name']
    for row in post16.iterrows():
        date = row[0].strftime('%m/%d/%Y')
        original_json['features'][i]["properties"]["registrations"][date] = row[1][county]
    original_json['features'][i]["properties"]["total_registrants"] = total_registrants[county]

print(original_json['features'][0]["properties"])
with open('data/final_data_new.json', 'w') as file:
    json.dump(original_json, file)
