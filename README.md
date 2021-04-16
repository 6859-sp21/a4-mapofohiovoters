# a4-mapofohiovoters

## Interactive animated visualization of Ohio voter registration by county from the 2016 to the 2020 general elections

6.859: Interactive Data Visualization

Noah Faro, Darian Bhathena, Rishi Shah

The overall purpose of our visualization originated from conversations with grassroots non-profit in Ohio focused on
increasing civic engagement and voter participation in the state. This organization was seeking greater visibility into
the pace and distribution of voter registrations throughout the state in order to more effectively target outreach
efforts. As such, our group aimed to leverage
the [State of Ohio’s Voter Files](https://www6.ohiosos.gov/ords/f?p=VOTERFTP:STWD:::#stwdVtrFiles) dataset to provide
this organization a tool to better understand voter registration in their state.

**Design Decisions: Data**

Significant design decisions had to be made in our exploratory data analysis and preprocessing steps. We foremost
decided to scope the dataset to focus on voter registration in the most recent general election cycle, rather than
incorporating the full dataset which spanned from the earliest registration date of active voters in Ohio. This allowed
for the visualization we were developing to focus on pace of registrations rather than larger scale changes in voter
registration, which would be more appropriate for data incorporating such a long time-span. During this data
exploration, we also immediately identified a need to incorporate population data for the geographical regions we would
showcase. While someone familiar with Ohio voter engagement would have been able to interpret absolute numbers of voter
registrations, we also wanted to make our visualization accessible to those who were not as familiar with this topic. As
such, we knew that registration per capita was going to be an important metric to showcase from our dataset. One of the
final data-centric design decisions we made was actually near the end of our final visualization development. As we
began to add the ability to visualize per-capita voter registration by city (rather than by county, which had already
been implemented), we began to see significant inconsistencies in the registration data. Particularly, we noticed
multiple instances where voter registration data totaled to numbers higher than the population of the city in which they
were registered. Having carefully checked that this inconsistency was rooted in the original dataset, and not a
byproduct of a mishandled preprocessing, we have reached out to the Ohio Secretary State’s office and are awaiting more
information on these inconsistencies. It is likely that there are a number of voters incorporated in the dataset who
have moved out of state or passed away (and were subsequently not removed from the voting files), but we are excited
interface with state government to learn more about the origins of the data.

**Design Decisions: Visualization**

Our first visualization decision was to view registration per county as a map. We felt that this would give context to
the information we were trying to convey, and also gave the user a greater sense of interaction - clicking to zoom,
hovering to view more data, etc. Our first decision was to display the registered voters per capita as a color opacity,
and chose a party-neutral color to represent the registered voters. Color opacity was chosen (rather than size of a
circle or another encoding) because we felt it was the most pre-attentive encoding that could successfully be used to
convey the data at a glance. It’s also important to note that we chose opacity rather than a color heat scale, because
we felt this was more accurate to convey the single-dimensional, increasing value over time. However this did lead to an
issue of scaling: we needed to decide how we were going to scale our data to fit within an opacity scale of 0-1. In the
end we scaled the minimum registrants per capita over all the counties to 0.1, and the maximum to 1. This way none of
the counties would start at 0 opacity (which might imply that there were NO registrants in 2016, which is misleading),
but there was the maximum possible range of opacities so the just-noticeable difference could be maximized. Lastly, we
added a slider with play functionality to allow the user to explore registration over time, since this was the main goal
of our project.

Although we liked the creativity of our map, and although we allow users to view individual county data directly with a
tooltip, We also felt like we needed a more quantitative way to compare multiple county data. For this reason, we added
two bar charts to a dashboard next to the map: one displaying the same metric as the map (as is easy to see because of
the same color and opacity encodings for the bars), and one displaying the absolute number of registrants (using a
different color and no opacity shading to convey this distinction). At first we included all 88 counties in this bar
chart, but realized based on feedback that this was too many to view all at once, and was overwhelming rather than
informative. We therefore made the design decision to limit the original number of bars to 10 counties, chosen because
they had the highest registrants per capita as of 2020. We didn’t want to limit the bars to this number alone, however,
so we decided to give the user the ability to add and remove counties from the bar charts by double clicking. We’d like
to note that we planned on adding more bar charts (or a toggle to visualize different metrics on the bar charts), but
because of the data inconsistencies described above, we decided to stick to just the two metrics about county data, and
displayed the city data as tooltips over the cities in the map. We hope to resolve these issues for our final project.

One piece of feedback that we received several times in our peer reviews was that it was difficult to visualize the rate
of registration: neither color, nor a change in bar size, was helpful in visualizing how fast participants were
registering over time. We thought about adding a bar chart to visualize rate, but we decided against this because we
realized that rate can change instantaneously from day to day in any given county, and so having the bars update so
rapidly as the time slider progressed would be distracting and difficult to follow. As such, we added a speedometer to
visualize the rate at which counties registered their voters. We limited the speedometer to one county as a time, since
multiple would be distracting. We also made the speedometer scale to the maximum number of registrants per day in the
selected county, rather than have a constant scale for all counties, because some counties have much higher
populations (and therefore registration rates) than others. Lastly, one thing we noticed was that for the majority of
the time, the speedometer hovers very close to zero, and spikes a few times (those outliers cause the scale to be much
larger than the usual number of registered voters per day). We considered implementing a logarithmic scale to counteract
this, but decided against it because we felt it would be less interpretable by our users, and because the goal of
enabling our users to see when registration rate spiked or increased, and then explore those times themselves, was still
achievable.

**Development Process and Distribution of Labor:**

Prior to even starting the development process, we had to do a hefty amount of preprocessing to get the data into a
usable format. At the very beginning of our development process we discussed how we would go about actually creating the
visualization, such as whether we wanted to make it in D3.js or in React or how we would go about formatting the html of
our design. We decided to utilize D3.js as this was a new, powerful tool with great documentation and very usable
tutorials for visualizations specifically. Following this, we created the map of Ohio by using a geojson of its
counties, and then added a zooming feature and tooltips as we also knew that we wanted to display data for the cities as
well. From here, we developed our scroll, play button, and dashboard completely separate from the map such that we had a
foundation for what each component would look like. We then implemented the functionality of the scroll bar with the
changing of the opacities in the map, which was our first cross-component connection. The scroll bar was then connected
to our dashboard, such that changes in the scroll dates also updated each individual chart and the speedometer. The last
cross-component feature that we added was the direct interactions between the dashboard and the map, such that
highlighted counties would also highlight on the dashboard, and double clicking either the county on the map or the
county on the dashboard would add or remove it from the dashboard.

We came to the quick conclusion that a vast majority of our time spent on this project was in preprocessing and on the
interactive functionalities between components. We found that prior to preprocessing the datasets had very large
discrepancies and inconsistencies in terms of naming conventions and labels, causing a large timesink at the beginning
of our development process. Following this, we did not have much trouble making the individual components themselves,
but their individual and cross-component interactions required a myriad of debugging and thoughtful coding, something
that we did not initially anticipate. In the final push of our project, making the visualization look nice and devoid of
bugs also consumed a large sum of time.

Between the three of us, Noah, Darian and Rishi split the workload very evenly: Rishi handled the preprocessing and
helped with many of the CSS decisions and coding involved, Darian and Noah split most of the component and interaction
creation within our D3.js scripts, and all three of us were involved in both the initial design and the ending write-up.
In terms of time per person, we all spent at least twenty hours per person including both the design and the
implementation. Regardless of the amount of time, we absolutely loved working on this project, and hope you enjoy the
result!
