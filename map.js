async function createMap() {
    const ohioCounties = await d3.json('./data/final_data.json');
    const countyPopulationsArray = await d3.csv('./data/population.csv');
    const countyPopulations = {};
    for (const data of countyPopulationsArray) {
        countyPopulations[data.county] = data.population;
    }
    const width = 1000;
    const height = 800;
    let margin = {top: 50, right: 50, bottom: 100, left: 50};

    let formatDateIntoYear = d3.timeFormat("%Y");
    let formatDate = date => {
        let dateString = d3.timeFormat("%m/%e/%Y")(date).replaceAll(/\s/g, '');
        if (dateString[0] === '0') {
            dateString = dateString.slice(1);
        }
        return dateString
    }

    let maxRegistrantsPerCapita = 0;

    let dates = Object.keys(ohioCounties.features[0].properties.registrations).map(dateString => new Date(dateString));
    dates = dates.sort((a, b) => a - b);

    const cumulativeSumMap = {};
    for (const feature of ohioCounties.features) {
        const name = feature.properties.name;
        if (feature.properties.total_registrants / countyPopulations[name] > maxRegistrantsPerCapita) {
            maxRegistrantsPerCapita = feature.properties.total_registrants / countyPopulations[name];
        }
        cumulativeSumMap[name] = {};
        let total = 0;
        for (const date of dates) {
            let dateString = formatDate(date);
            total += feature.properties.registrations[dateString]
            cumulativeSumMap[name][dateString] = total;
        }
    }

    const startDate = new Date("2016-11-09"),
        endDate = new Date("2020-10-06");

    const projection = d3.geoEquirectangular().fitExtent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]], ohioCounties);
    const path = d3.geoPath().projection(projection);

    let isZoomed = false;

    const zoom = d3.zoom()
        .scaleExtent([1, 4])
        .on('zoom', zoomed);

    const svg1 = d3.select("#visualization-container")
        .append("svg")
        .attr('width', width)
        .attr('height', 100);

    let x = d3.scaleTime()
        .domain([startDate, endDate])
        .range([0, width - margin.right - margin.left])
        .clamp(true);

    let slider = svg1.append("g")
        .attr("class", "slider")
        .attr("transform", "translate(" + margin.left + "," + 50 + ")");

    slider.append("line")
        .attr("class", "track")
        .attr("x1", x.range()[0])
        .attr("x2", x.range()[1])
        .select(function () {
            return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr("class", "track-inset")
        .select(function () {
            return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function () {
                slider.interrupt();
            })
            .on("start drag", function (event) {
                updateDate(x.invert(event.x));
            }));

    slider.insert("g", ".track-overlay")
            .attr("class", "ticks")
            .attr("transform", "translate(0," + 18 + ")")
        .selectAll("text")
        .data(x.ticks(4))
        .enter()
        .append("text")
            .attr("x", x)
            .attr("y", 10)
            .attr("text-anchor", "middle")
            .attr("font-size", 16)
            .text(function (d) {
                return formatDateIntoYear(d);
            })

    let label = slider.append("text")
        .attr("class", "label")
        .attr("text-anchor", "middle")
        .text(formatDate(startDate))
        .attr("transform", "translate(0," + (-25) + ")")

    let handle = slider.insert("circle", ".track-overlay")
        .attr("class", "handle")
        .attr("r", 9);

    function updateDate(h) {
        handle.attr("cx", x(h));
        label
            .attr("x", x(h))
            .text(formatDate(h));
        counties.style('fill-opacity', d => cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name] / maxRegistrantsPerCapita)
    }

    ///

    const svg2 = d3.select("#visualization-container")
        .append("svg")
        .attr('width', width)
        .attr('height', height);

    const ohio = svg2.append('g');

    const counties = ohio.append('g')
        .attr('stroke', '#444')
        .attr('stroke-width', 1)
        .attr('fill', '#9f67fa')
        .attr('cursor', 'pointer')
        .selectAll('path')
        .data(ohioCounties.features)
        .join('path')
        .on('click', function (e, d) {
            isZoomed ? reset() : clicked(e, d, this)
        })
        .on('mouseover', hoveringStart)
        .on('mouseout', hoveringEnd)
        .attr('d', path)
        .attr('fill-opacity', d => {
            return cumulativeSumMap[d.properties.name][formatDate(startDate)] / countyPopulations[d.properties.name] / maxRegistrantsPerCapita;
        })
        .attr('stroke-opacity', 1);

    counties.append("title")
        .text(d => d.properties.name);

    function reset() {
        counties.transition().style('fill', null);
        svg1.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg1.node()).invert([width / 2, height / 2])
        )
        isZoomed = false;
    }

    function hoveringStart() {
        counties.transition().style('fill', null);
        d3.select(this).transition().style('fill', "#5C7FEC");
    }

    function hoveringEnd() {
        counties.transition().style('fill', null);
    }

    function clicked(event, d, obj) {
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        event.stopPropagation();
        counties.transition().style("fill", null);
        d3.select(obj).transition().style('fill', 'blue');
        svg1.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(4, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.pointer(event, svg1.node())
        );
        isZoomed = true;
    }

    function zoomed(event) {
        const {transform} = event;
        ohio.attr("transform", transform);
        ohio.attr('stroke-width', 1 / transform.k);
    }
}
