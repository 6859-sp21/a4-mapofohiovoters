# a4-mapofohiovoters
a4-mapofohiovoters created by GitHub Classroom

Interactive animated visualization of Ohio voter registration by county from the 2016 to the 2020 general elections

**Small Priorities of Work:**
- Zooming issue
    - Make the full viz fit on a page verticaly
    - add button for zoom out
    
- Flip bar chart order

**Large Priorities of Work:**
- Re-Preprocess county-based dataset
    - Aggregate registration data pre-2016
    - Add political parties information
    - Add missing dates
    
- Create city-based dataset
    - Preprocessing:
        - aggregate by city
        - add missing dates
        - add political parties
    - GeoJSON of Cities
    - Visualize major cities on state-wide map
    - Visualize cities via point embeddings upon zoom in to counties
        - Potential embedding: change size of point based on rate of registration?
    
- Change bar chart to rate-based
    - Only visualize the top/bottom 5
    - Potentially do a 'bar chart race'-type graph

