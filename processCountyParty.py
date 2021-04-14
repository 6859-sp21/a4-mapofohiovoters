import pandas as pd
import numpy as np
import csv

countyMapInt = dict()
countyMapStr = dict()
with open('data/county_codes.csv', mode='r') as infile:
    reader = csv.reader(infile)
    for i, row in enumerate(reader):
        if i == 0:
            continue
        countyMapInt[int(row[1])] = row[0]
        countyMapStr[str(row[1])] = row[0]

party_df = pd.read_csv('data/partyByCounty.csv', parse_dates=['REGISTRATION_DATE'], infer_datetime_format=True)
party_df.set_index('REGISTRATION_DATE', inplace=True)
party_df['COUNTY_NUMBER'] = party_df['COUNTY_NUMBER'].replace(countyMapInt)
party_df = party_df.sort_index()
party_df.insert(2, 'PARTY_SKEW', np.nan)

registrant_df = pd.read_csv('data/numRegByCounty.csv', parse_dates=['REGISTRATION_DATE'], infer_datetime_format=True)
registrant_df.set_index('REGISTRATION_DATE', inplace=True)
registrant_df = registrant_df.fillna(0)
registrant_df.rename(columns=countyMapStr, inplace=True)
registrant_df = registrant_df.sort_index()

for row in party_df.iterrows():
    date = row[0]
    county = row[1]['COUNTY_NUMBER']
    party_ratio = row[1]['PARTY_CODED']
    num_registrants = registrant_df[county][date]
    party_df.loc[(party_df.index == date) & (party_df['COUNTY_NUMBER'] == county), 'PARTY_SKEW'] = party_ratio * num_registrants

print(party_df.loc[np.datetime64('1900-01-01')])

party_df.to_csv('data/partyByCountySkew.csv')
