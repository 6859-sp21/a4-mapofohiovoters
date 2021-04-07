async function createMap() {

    // ----------- CONSTANTS & HELPERS -----------
    const width = 1200;
    const height = 900;
    const barHeight = 10;
    let margin = {top: 50, right: 50, bottom: 100, left: 50};
    let moving = false;

    //Used to access properties of what is currently being hovered so that tooltip
    //html can be updated while playing
    let hoveredProperties = {};

    let formatDateIntoYear = d3.timeFormat("%Y");
    let formatDate = date => {
        let dateString = d3.timeFormat("%m/%e/%Y")(date).replaceAll(/\s/g, '');
        if (dateString[0] === '0') {
            dateString = dateString.slice(1);
        }
        return dateString
    }

    let currentDateIndex = 0;
    let isZoomed = "";

    // ----------- DATA -----------
    const ohioCounties = await d3.json('./data/final_data.json');
    const countyPopulationsArray = await d3.csv('./data/population.csv');
    const countyPopulations = {};
    for (const data of countyPopulationsArray) {
        countyPopulations[data.county] = data.population;
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
    const startDate = dates[0],
        endDate = dates[dates.length - 1];
    const projection = d3.geoEquirectangular().fitExtent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]], ohioCounties);
    const path = d3.geoPath().projection(projection);


    // ----------- SLIDER -----------
    const svg1 = d3.select("#slider-container")
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
                const date = x.invert(event.x);
                currentDateIndex = dates.findIndex(value => value.getDate() === date.getDate() && value.getMonth() === date.getMonth() && value.getFullYear() === date.getFullYear());
                updateDate(date);
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
        updateTooltip();
        handle.attr("cx", x(h));
        label
            .attr("x", x(h))
            .text(formatDate(h));
        counties.style('fill-opacity', d => cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name] / maxRegistrantsPerCapita)
        bars.attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name]))

        // tooltip.html(d => {`<strong style="font-size: 16px;">${d.properties.name}</strong><br/>Population: <strong>${pop}</strong><br/># of Registered Voters: <strong>${registeredVoters}</strong><br/>Registered Voters per Capita: <strong>${perCapitaRegistrants}</strong>`});
    }

    // ----------- PLAY BUTTON -----------
    const playButton = d3.select("#play-button");
    playButton
        .on('click', function () {
            const button = d3.select(this);
            if (button.text() === "Pause") {
                moving = false;
                clearInterval(timer);
                button.text("Play");
            } else {
                moving = true;
                if (currentDateIndex === dates.length - 1) {
                    currentDateIndex = 0;
                }
                timer = setInterval(step, 5);
                button.text("Pause");
            }
        })

    function step() {
        updateDate(dates[currentDateIndex]);
        currentDateIndex++;
        if (currentDateIndex >= dates.length) {
            moving = false;
            currentDateIndex = dates.length - 1;
            clearInterval(timer);
            playButton.text("Play");
        }
    }

    // ----------- TOOLTIP -----------
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // ----------- MAP -----------
    const zoom = d3.zoom()
        .scaleExtent([1, 4])
        .on('zoom', zoomed);

    const svg2 = d3.select("#visualization-container")
        .append("svg")
        .attr('width', width)
        .attr('height', height);

    const ohio = svg2.append('g');

    const counties = ohio.append('g')
        .attr('stroke', '#444')
        .attr('stroke-width', 1.5)
        .attr('fill', '#9f67fa')
        .attr('cursor', 'pointer')
        .selectAll('path')
        .data(ohioCounties.features)
        .join('path')
        .on('click', function (e, d) {
            (isZoomed === d.properties.geo_id) ? reset() : clicked(e, d, this)
        })
        .on('mouseover', hoveringStart)
        .on('mouseout', hoveringEnd)
        .attr('d', path)
        .attr('fill-opacity', d => {
            return cumulativeSumMap[d.properties.name][formatDate(startDate)] / countyPopulations[d.properties.name] / maxRegistrantsPerCapita;
        })
        .attr('stroke-opacity', 1);

    function reset() {
        svg2.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg2.node()).invert([width / 2, height / 2])
        )
        isZoomed = false;
    }

    function hoveringStart(event, d) {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.95);

        hoveredProperties = d.properties;
        updateTooltip();

        tooltip.style("left", `${event.pageX}px`)
            .style('background', '#f5f6f7')
            .style("top", `${event.pageY}px`);

        d3.select(this)
            .attr("fill", 'black')
            .attr("stroke-width", 3)

        d3.select(this)
            .attr("fill", 'black')
            .attr("stroke-width", 3)
    }

    function updateTooltip() {
        const pop = countyPopulations[hoveredProperties.name];
        const registeredVoters = cumulativeSumMap[hoveredProperties.name][formatDate(dates[currentDateIndex])];
        const perCapitaRegistrants = (registeredVoters / pop).toFixed(3);
        tooltip.html(`<strong style="font-size: 16px;">${hoveredProperties.name}</strong><br/>Population: <strong>${pop}</strong><br/># of Registered Voters: <strong>${registeredVoters}</strong><br/>Registered Voters per Capita: <strong>${perCapitaRegistrants}</strong>`);
    }

    function hoveringEnd() {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0);

        d3.select(this)
            .attr('fill', null)
            .attr('stroke-width', null);
    }

    function clicked(event, d, obj) {
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        event.stopPropagation();
        counties.transition().style("fill", null);
        svg2.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(4, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.pointer(event, svg2.node())
        );
        isZoomed = d.properties.geo_id;
    }

    function zoomed(event) {
        const {transform} = event;
        ohio.attr("transform", transform);
        ohio.attr('stroke-width', 1 / transform.k);
    }

    // ----------- BAR CHART -----------
    const barScale = d3.scaleLinear()
        .domain([0, 0.5])
        .range([margin.left, width - margin.right])
        .nice();

    const svg3 = d3.select("#visualization-container")
        .append("svg")
        .attr('width', width)
        .attr('height', height);

    const bars = svg3.selectAll('rect')
        .data(ohioCounties.features)
        .join('rect')
        .attr('x', 0)
        .attr('y', (d, i) => i * barHeight)
        .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('height', barHeight)
        .style('fill', '#9f67fa')
        .style('stroke', 'white')

    svg3.append('g')
        .attr('transform', `translate(${-margin.left}, ${height})`)
        .call(d3.axisBottom(barScale))
        .append('text')
            .attr('text-anchor', 'end')
            .attr('fill', 'black')
        .text('test')

    svg3.selectAll('text')
        .data(ohioCounties.features)
        .join('text')
        .attr('x', 10)
        .attr('y', (d, i) => i * barHeight)
        .attr('fill', 'white')
        .text((d, i) => i)
}
