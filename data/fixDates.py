import pandas as pd
import numpy as np
from datetime import date, timedelta
import csv

countyMap = dict()
with open('county_codes.csv', mode='r') as infile:
    reader = csv.reader(infile)
    for i, row in enumerate(reader):
        if i == 0:
            continue
        countyMap[int(row[1])] = row[0]

df = pd.read_csv('numRegByCounty.csv', dtype=int, parse_dates=['REGISTRATION_DATE'], infer_datetime_format=True)
df.rename(columns=countyMap, inplace=True)  # convert county names
pre16 = df[(df['REGISTRATION_DATE'] <= np.datetime64('2016-11-08'))]
post16 = df[(np.datetime64('2016-11-08') < df['REGISTRATION_DATE'] < np.datetime64('2020-10-05'))]
cumulative = pre16.sum(axis=0)
cumulative['REGISTRATION_DATE'] = np.datetime64('000-01-01')
post16.loc[-1] = cumulative  # add the cumulative totals to top
post16.index = post16.index + 1
post16 = post16.sort_index()  # resort

allDates = []
startDate = date(year=2016, month=11, day=8)
endDate = date(year=2020, month=10, day=5)
delta = endDate - startDate  # type=timedelta
for i in range(delta.days + 1):
    day = startDate + timedelta(days=i)
    allDates.append(day)

#  iterate through all dates, insert missing
