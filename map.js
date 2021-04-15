async function createMap() {

    // ----------- CONSTANTS & HELPERS -----------
    const width = window.innerHeight;
    const height = window.innerHeight*.75;
    const barHeight = 10;
    let margin = {top: 50, right: 50, bottom: 100, left: 50};
    let moving = false;
    let stepTime = 100;

    //Used to access properties of what is currently being hovered so that tooltip
    //html can be updated while playing
    let hoveredProperties = null;

    let formatDateIntoYear = d3.timeFormat("%Y");
    let formatDate = date => {
        // let dateString = d3.timeFormat("%m/%e/%Y")(date).replaceAll(/\s/g, '');
        // if (dateString[0] === '0') {
        //     dateString = dateString.slice(1);
        // }
        // return dateString
        return d3.timeFormat("%m/%d/%Y")(date)
    }

    function deg2rad(deg) {
        return deg * Math.PI / 180;
    }

    const arcColorFn = d3.interpolate(d3.rgb('#ebf0ff'), d3.rgb('#5C7FEC'))

    const percentRegSelected = new Set(['Ottawa', 'Lawrence', 'Jefferson', 'Hamilton', 'Medina', 'Geauga', 'Delaware', 'Erie', 'Mahoning', 'Henry']);

    let currentDateIndex = 0;
    let isZoomed = "";
    let zoomedCountyData = undefined;

    // ----------- DATA -----------
    const ohioCounties = await d3.json('./data/final_data_new.json');
    const ohioCities = await d3.json('./data/ohio_cities.geojson')
    const countyPopulationsArray = await d3.csv('./data/population.csv');
    const countyPopulations = {};
    for (const data of countyPopulationsArray) {
        countyPopulations[data.county] = data.population;
    }
    let maxRegistrantsPerCapita = 0;
    let minRegistrantsPerCapita = ohioCounties.features[0].properties.registrations["11/08/2016"] / countyPopulations[ohioCounties.features[0].properties.name]

    let dates = Object.keys(ohioCounties.features[0].properties.registrations).map(dateString => new Date(dateString));
    dates = dates.sort((a, b) => a - b);

    const cumulativeSumMap = {};
    for (const feature of ohioCounties.features) {
        const name = feature.properties.name;
        if (feature.properties.total_registrants / countyPopulations[name] > maxRegistrantsPerCapita) {
            maxRegistrantsPerCapita = feature.properties.total_registrants / countyPopulations[name];
        }
        if (feature.properties.registrations["11/08/2016"] / countyPopulations[name] < minRegistrantsPerCapita) {
            minRegistrantsPerCapita = feature.properties.registrations["11/08/2016"] / countyPopulations[name];
        }
        cumulativeSumMap[name] = {};
        let total = 0;
        let maxRegistrants = 0;
        dates.forEach((date, i) => {
            let dateString = formatDate(date);
            const registrants = feature.properties.registrations[dateString]
            total += registrants
            if (i !== 0 && registrants > maxRegistrants) {
                maxRegistrants = registrants
            }
            cumulativeSumMap[name][dateString] = total;
        })
        feature.properties.maxRegistrants = maxRegistrants;
    }
    const startDate = dates[0],
        endDate = dates[dates.length - 1];
    const projection = d3.geoEquirectangular().fitExtent([[margin.left, margin.top], [width*.85 - margin.right, height - margin.bottom]], ohioCounties);
    const path = d3.geoPath().projection(projection);

    const opacityScale = d3.scaleLinear().domain([minRegistrantsPerCapita, maxRegistrantsPerCapita]).range([0.1, 1])
    const calculateOpacity = (date, county) => {
        const numRegistrants = cumulativeSumMap[county][date]
        const population = countyPopulations[county]
        const registrantsPerCapita = numRegistrants / population
        const opacity = opacityScale(registrantsPerCapita)
        return opacity
    }

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
        if (hoveredProperties != null) {
            updateTooltip();
        }
        handle.attr("cx", x(h));
        label
            .attr("x", x(h))
            .text(formatDate(h));
        counties.style('fill-opacity', d => calculateOpacity(formatDate(h), d.properties.name))
        percentageBars.attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name]))
        percentageBars.style('fill-opacity', d => calculateOpacity(formatDate(h), d.properties.name))
        percentageBarLabels.attr('x', d => barScale(cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name]))
        percentageBarsCity.attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name]))
        percentageBarsCity.style('fill-opacity', d => calculateOpacity(formatDate(h), d.properties.name))
        percentageBarLabelsCity.attr('x', d => barScale(cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name]))
        let delta = zoomedCountyData ? zoomedCountyData.properties.registrations[formatDate(dates[currentDateIndex])] : 0;
        updateSpeedometerPointer(delta)
    }

    // ----------- PLAY BUTTON -----------
    const playButton = d3.select("#play-button");
    playButton
        .on('click', function () {
            const button = d3.select(this);
            if (button.text() === "Pause") {
                moving = false;
                clearInterval(timer);
                button
                    .style("background-color", "#9f67fa88")
                    .text("Play");
            } else {
                moving = true;
                if (currentDateIndex === dates.length - 1) {
                    currentDateIndex = 0;
                }
                timer = setInterval(step, stepTime);
                button
                    .style("background-color", "#9f67fa")
                    .text("Pause");
            }
        })

    const speedButtons = d3.selectAll(".speed-button");
    speedButtons
        .on('click', function () {
            const button = d3.select(this);
            console.log(button.text())
            if (button.text() === '1x') {
                stepTime = 100;
            } else if (button.text() === '2x') {
                stepTime = 30;
            } else if (button.text() === '3x') {
                stepTime = 5;
            }
            if (moving) {
                clearInterval(timer);
                timer = setInterval(step, stepTime);
            }
            speedButtons.style('opacity', 0.6);
            button.style('opacity', 1);
        })

    function step() {
        updateDate(dates[currentDateIndex]);
        currentDateIndex++;
        if (currentDateIndex >= dates.length) {
            moving = false;
            currentDateIndex = dates.length - 1;
            clearInterval(timer);
            playButton
                .style("background-color", "#9f67fa88")
                .text("Play");
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

    const svg2 = d3.select("#map-container")
        .append("svg")
        .attr('width', width)
        .attr('height', height);
        // .style('margin-right', "50px");

    const ohio = svg2.append('g');

    const counties = ohio.append('g')
        .attr('stroke', '#444')
        .attr('stroke-width', 1.5)
        .attr('fill', '#9f67fa')
        .attr('cursor', 'pointer')
        .selectAll('path')
        .data(ohioCounties.features)
        .join('path')
        .on('mouseover', hoveringCountyStart)
        .on('mouseout', hoveringCountyEnd)
        .attr('d', path)
        .attr('fill-opacity', d => {
            return calculateOpacity(formatDate(startDate), d.properties.name);
        })
        .attr('stroke-opacity', 1);


    const cities = ohio.append('g')
        .attr('stroke', 'none')
        .attr('fill-opacity', 0.6)
        .attr('fill', 'black')
        .attr('cursor', 'pointer')

    function clickcancel() {
        // we want to a distinguish single/double click
        // details http://bl.ocks.org/couchand/6394506
        let dispatcher = d3.dispatch('click', 'dblclick');

        function cc(selection) {
            let down, tolerance = 5, last, wait = null, args;

            // euclidean distance
            function dist(a, b) {
                return Math.sqrt(Math.pow(a[0] - b[0], 2), Math.pow(a[1] - b[1], 2));
            }

            selection.on('mousedown', function () {
                down = d3.pointer(document.body);
                last = +new Date();
                args = arguments;
            });
            selection.on('mouseup', function () {
                if (dist(down, d3.pointer(document.body)) > tolerance) {
                    return;
                } else {
                    if (wait) {
                        window.clearTimeout(wait);
                        wait = null;
                        dispatcher.apply("dblclick", this, args);
                    } else {
                        wait = window.setTimeout((function () {
                            return function () {
                                dispatcher.apply("click", this, args);
                                wait = null;
                            };
                        })(), 300);
                    }
                }
            });
        }

        // Copies a variable number of methods from source to target.
        let d3rebind = function (target, source) {
            let i = 1, n = arguments.length, method;
            while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
            return target;
        };

        // Method is assumed to be a standard D3 getter-setter:
        // If passed with no arguments, gets the value.
        // If passed with arguments, sets the value and returns the target.
        function d3_rebind(target, source, method) {
            return function () {
                let value = method.apply(source, arguments);
                return value === source ? target : value;
            };
        }

        return d3rebind(cc, dispatcher, 'on');
    }

    const cc = clickcancel();
    counties.call(cc);
    cities.call(cc);
    cc.on('click', function (e, d) {
        (isZoomed === d.properties.name) ? reset() : clicked(e, d, this)
    })

    function reset() {
        svg2.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg2.node()).invert([width / 2, height / 2])
        )
        cities.selectAll('path')
            .data([])
            .join('path')
        isZoomed = "";
        zoomedCountyData = undefined;
        updateSpeedometer(0, "", 10)
    }

    function hoveringCityStart(event, d) {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.95);

        hoveredProperties = d.properties;
        updateTooltip();

        tooltip.style("left", `${event.pageX}px`)
            .style('background', '#f5f6f7')
            .style("top", `${event.pageY}px`);

        d3.select(this)
            .attr('fill-opacity', 0.9)
    }

    function hoveringCountyStart(event, d) {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.95);

        hoveredProperties = d.properties;
        updateTooltip();

        tooltip.style("left", `${event.pageX}px`)
            .style('background', '#f5f6f7')
            .style("top", `${event.pageY}px`);

        d3.select(this)
            .attr("fill", '#da8601')
            .attr("stroke-width", 2.5)
            .attr("cursor", () => (isZoomed === d.properties.name) ? "zoom-out" : "pointer");

        percentageBars
            .attr("stroke", da => d.properties.name === da.properties.name ? "#444" : null)
        percentageBarLabels
            .attr("fill", da => d.properties.name === da.properties.name ? "#444" : "grey")
            .style("font-weight", da => d.properties.name === da.properties.name ? 900 : "normal")
    }

    function updateTooltip() {
        if (hoveredProperties.lsad === 'County') {
            const pop = countyPopulations[hoveredProperties.name];
            const registeredVoters = cumulativeSumMap[hoveredProperties.name][formatDate(dates[currentDateIndex])];
            const perCapitaRegistrants = (100 * registeredVoters / pop).toFixed(3);
            tooltip.html(`<strong style="font-size: 16px;">${hoveredProperties.name}</strong><br/>Population: <strong>${pop}</strong><br/># of Registered Voters: <strong>${registeredVoters}</strong><br/>% of Pop Registered: <strong>${perCapitaRegistrants}%</strong>`);
        } else {
            tooltip.html(`<strong style="font-size: 16px;">${hoveredProperties.name}</strong>`);
        }
    }

    function hoveringCityEnd() {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0);

        d3.select(this)
            .attr('fill-opacity', null);
    }

    function hoveringCountyEnd() {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0);

        d3.select(this)
            .attr('fill', null)
            .attr('stroke-width', null)
            .attr('cursor', 'pointer');

        percentageBars
            .attr("stroke", null)
        percentageBarLabels
            .attr("fill", "grey")
            .style("font-weight", "normal")
    }

    function clicked(event, d, obj) {
        zoomedCountyData = d;
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
        isZoomed = d.properties.name;
        cities.selectAll('path')
            .data(ohioCities.features.filter(city => city.properties.county === d.properties.name))
            .join('path')
            .attr('d', path)
            .on('mouseover', hoveringCityStart)
            .on('mouseout', hoveringCityEnd)
        let delta = d.properties.registrations[formatDate(dates[currentDateIndex])]
        updateSpeedometer(delta, d.properties.name, d.properties.maxRegistrants)
    }

    function zoomed(event) {
        const {transform} = event;
        ohio.attr("transform", transform);
        ohio.attr('stroke-width', 1 / transform.k);
    }

    // ----------- PERCENTAGE BAR CHART -----------
    const barScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width / 4 - margin.right])
        .nice();


    const svg3 = d3.select("#population-graph-container")
        .append("svg")
        .attr('width', width / 4)
        .attr('height', 100 + barHeight*percentRegSelected.size);

    const originalData = ohioCounties.features
        .sort((x, y) => d3.descending(
            x.properties.total_registrants / countyPopulations[x.properties.name],
            y.properties.total_registrants / countyPopulations[y.properties.name]
        ))
        .filter(county => percentRegSelected.has(county.properties.name))
    let percentageBars = svg3.selectAll('rect')
        .data(originalData, d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
        .join('rect') //Same with the positioning of the labels rather than hardcoded pixels
        .attr('class', 'percentage-bar')
        .attr('x', 0)
        .attr('y', (d, i) => i * (barHeight + 4))
        .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('height', barHeight)
        .attr('rx', 2)
        .style('fill', '#9f67fa')
        .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
        .attr('transform', 'translate(5, 2)')
        .attr('stroke-width', 2)

    let percentageBarLabels = svg3.selectAll('text')
        .data(originalData, d => d.properties.name)
        .join('text')
        .attr('class', 'percentage-bar-labels')
        .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
        .attr('dx', 10)
        .attr('fill', 'grey')
        .attr('font-size', 10)
        .text(d => d.properties.name);

    const percentageAxis = svg3.append('g')
        .attr('transform', `translate(5, ${(barHeight + 4) * percentRegSelected.size + 5})`) // Control translation of % pop
        .call(d3.axisBottom(barScale).tickFormat(d => d * 100))
    percentageAxis
        .append('text')
        // .attr('text-anchor', 'end')
        .attr('fill', 'black')
        .attr('font-size', '13px')
        .attr('font-weight', 'bold')
        .attr('x', width/9 - 5) //Controls x start of % pop
        .attr('y', 30) //Controls y location relative to translate above
        .text('% of population registered')

    svg3.append('text')
        .attr('transform', `translate(${width / 2 - margin.right}, ${10}) rotate(90)`)
        .attr('text-anchor', 'center')
        .attr('fill', 'black')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Counties')

//----------------------------Second Column Bar Chart Sizing --------------------------------

    const svg4 = d3.select("#population-graph-container")
    .append("svg")
    .attr('width', width / 4)
    .attr('height', 100 + barHeight*percentRegSelected.size);

    let percentageBarsCity = svg4.selectAll('rect')
        .data(originalData, d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
        .join('rect') //Same with the positioning of the labels rather than hardcoded pixels
        .attr('class', 'percentage-bar')
        .attr('x', 0)
        .attr('y', (d, i) => i * (barHeight + 4))
        .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('height', barHeight)
        .attr('rx', 2)
        .style('fill', '#9f67fa')
        .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
        .attr('transform', 'translate(5, 2)')
        .attr('stroke-width', 2)

    let percentageBarLabelsCity = svg4.selectAll('text')
        .data(originalData, d => d.properties.name)
        .join('text')
        .attr('class', 'percentage-bar-labels')
        .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
        .attr('dx', 10)
        .attr('fill', 'grey')
        .attr('font-size', 10)
        .text(d => d.properties.name);

    const percentageAxisCity = svg4.append('g')
        .attr('transform', `translate(5, ${(barHeight + 4) * percentRegSelected.size + 5})`) // Control translation of % pop
        .call(d3.axisBottom(barScale).tickFormat(d => d * 100))
    percentageAxisCity
        .append('text')
        // .attr('text-anchor', 'end')
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('x', width / 4.5 - 5) //Controls x start of % pop
        .attr('y', 30) //Controls y location relative to translate above
        .text('% of population registered')

    svg4.append('text')
        .attr('transform', `translate(${width / 2 - margin.right}, ${10}) rotate(90)`)
        .attr('text-anchor', 'center')
        .attr('fill', 'black')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Counties')

//-----------------------Use of Bottom Left Graph --------------------------------------

    const svg5 = d3.select("#percapita-graph-container")
    .append("svg")
    .attr('width', width / 4)
    .attr('height', 100 + barHeight*percentRegSelected.size);

    let perCapitaBarsCounty = svg5.selectAll('rect')
        .data(originalData, d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
        .join('rect') //Same with the positioning of the labels rather than hardcoded pixels
        .attr('class', 'percentage-bar')
        .attr('x', 0)
        .attr('y', (d, i) => i * (barHeight + 4))
        .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('height', barHeight)
        .attr('rx', 2)
        .style('fill', '#9f67fa')
        .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
        .attr('transform', 'translate(5, 2)')
        .attr('stroke-width', 2)

    let perCapitaBarLabelsCounty = svg5.selectAll('text')
        .data(originalData, d => d.properties.name)
        .join('text')
        .attr('class', 'percentage-bar-labels')
        .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
        .attr('dx', 10)
        .attr('fill', 'grey')
        .attr('font-size', 10)
        .text(d => d.properties.name);

    const perCapitaAxisCounty = svg5.append('g')
        .attr('transform', `translate(5, ${(barHeight + 4) * percentRegSelected.size + 5})`) // Control translation of % pop
        .call(d3.axisBottom(barScale).tickFormat(d => d * 100))
    perCapitaAxisCounty
        .append('text')
        // .attr('text-anchor', 'end')
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('x', width / 4.5 - 5) //Controls x start of % pop
        .attr('y', 30) //Controls y location relative to translate above
        .text('% of population registered')

    svg5.append('text')
        .attr('transform', `translate(${width / 2 - margin.right}, ${10}) rotate(90)`)
        .attr('text-anchor', 'center')
        .attr('fill', 'black')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Counties')

//-----------------------------Use of Bottom Right Graph --------------------------------------------


    const svg6 = d3.select("#percapita-graph-container")
    .append("svg")
    .attr('width', width / 4)
    .attr('height', 100 + barHeight*percentRegSelected.size);

    let perCapitaBarsCity = svg6.selectAll('rect')
        .data(originalData, d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
        .join('rect') //Same with the positioning of the labels rather than hardcoded pixels
        .attr('class', 'percentage-bar')
        .attr('x', 0)
        .attr('y', (d, i) => i * (barHeight + 4))
        .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('height', barHeight)
        .attr('rx', 2)
        .style('fill', '#9f67fa')
        .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
        .attr('transform', 'translate(5, 2)')
        .attr('stroke-width', 2)

    let perCapitaBarLabelsCity = svg6.selectAll('text')
        .data(originalData, d => d.properties.name)
        .join('text')
        .attr('class', 'percentage-bar-labels')
        .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
        .attr('dx', 10)
        .attr('fill', 'grey')
        .attr('font-size', 10)
        .text(d => d.properties.name);

    const perCapitaAxisCity = svg6.append('g')
        .attr('transform', `translate(5, ${(barHeight + 4) * percentRegSelected.size + 5})`) // Control translation of % pop
        .call(d3.axisBottom(barScale).tickFormat(d => d * 100))
    perCapitaAxisCity
        .append('text')
        // .attr('text-anchor', 'end')
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('x', width / 4.5 - 5) //Controls x start of % pop
        .attr('y', 30) //Controls y location relative to translate above
        .text('% of population registered')

    svg6.append('text')
        .attr('transform', `translate(${width / 2 - margin.right}, ${10}) rotate(90)`)
        .attr('text-anchor', 'center')
        .attr('fill', 'black')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Counties')

    cc.on('dblclick', function (e, d) {
        (!percentRegSelected.has(d.properties.name)) ? percentRegSelected.add(d.properties.name) : percentRegSelected.delete(d.properties.name)
        svg6.attr('height', 100 + (barHeight)*percentRegSelected.size + 4*(percentRegSelected.size - 10));
        svg5.attr('height', 100 + (barHeight)*percentRegSelected.size + 4*(percentRegSelected.size - 10));
        svg4.attr('height', 100 + (barHeight)*percentRegSelected.size + 4*(percentRegSelected.size - 10));
        svg3.attr('height', 100 + (barHeight)*percentRegSelected.size + 4*(percentRegSelected.size - 10));
        const newData = ohioCounties.features
            .sort((x, y) => {
                return d3.descending(
                    x.properties.total_registrants / countyPopulations[x.properties.name],
                    y.properties.total_registrants / countyPopulations[y.properties.name]
                )
            })
            .filter(county => percentRegSelected.has(county.properties.name));

        percentageBars = svg3.selectAll('.percentage-bar')
            .data(newData, d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
            .join('rect')
            .attr('class', 'percentage-bar')
            .attr('x', 0)
            .attr('y', (d, i) => i * (barHeight + 4))
            .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('height', barHeight)
            .attr('rx', 2)
            .style('fill', '#9f67fa')
            .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
            .attr('transform', 'translate(5, 2)')
            .attr('stroke-width', 2)

        percentageBarLabels = svg3.selectAll('.percentage-bar-labels')
            .data(newData, d => d.properties.name)
            .join('text')
            .attr('class', 'percentage-bar-labels')
            .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
            .attr('dx', 10)
            .attr('fill', 'grey')
            .attr('font-size', 10)
            .text(d => d.properties.name);

        percentageAxis.attr('transform', `translate(5, ${(barHeight + 4) * percentRegSelected.size + 5})`)

        percentageBarsCity = svg4.selectAll('.percentage-bar')
            .data(newData, d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
            .join('rect')
            .attr('class', 'percentage-bar')
            .attr('x', 0)
            .attr('y', (d, i) => i * (barHeight + 4))
            .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('height', barHeight)
            .attr('rx', 2)
            .style('fill', '#9f67fa')
            .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
            .attr('transform', 'translate(5, 2)')
            .attr('stroke-width', 2)

        percentageBarLabelsCity = svg4.selectAll('.percentage-bar-labels')
            .data(newData, d => d.properties.name)
            .join('text')
            .attr('class', 'percentage-bar-labels')
            .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
            .attr('dx', 10)
            .attr('fill', 'grey')
            .attr('font-size', 10)
            .text(d => d.properties.name);

        percentageAxisCity.attr('transform', `translate(5, ${(barHeight + 4) * percentRegSelected.size + 5})`)

        perCapitaBarsCounty = svg5.selectAll('.percentage-bar')
            .data(newData, d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
            .join('rect')
            .attr('class', 'percentage-bar')
            .attr('x', 0)
            .attr('y', (d, i) => i * (barHeight + 4))
            .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('height', barHeight)
            .attr('rx', 2)
            .style('fill', '#9f67fa')
            .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
            .attr('transform', 'translate(5, 2)')
            .attr('stroke-width', 2)

        perCapitaBarLabelsCounty = svg5.selectAll('.percentage-bar-labels')
            .data(newData, d => d.properties.name)
            .join('text')
            .attr('class', 'percentage-bar-labels')
            .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
            .attr('dx', 10)
            .attr('fill', 'grey')
            .attr('font-size', 10)
            .text(d => d.properties.name);

        perCapitaAxisCounty.attr('transform', `translate(5, ${(barHeight + 4) * percentRegSelected.size + 5})`)

        perCapitaBarsCity = svg6.selectAll('.percentage-bar')
            .data(newData, d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
            .join('rect')
            .attr('class', 'percentage-bar')
            .attr('x', 0)
            .attr('y', (d, i) => i * (barHeight + 4))
            .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('height', barHeight)
            .attr('rx', 2)
            .style('fill', '#9f67fa')
            .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
            .attr('transform', 'translate(5, 2)')
            .attr('stroke-width', 2)

        perCapitaBarLabelsCity = svg6.selectAll('.percentage-bar-labels')
            .data(newData, d => d.properties.name)
            .join('text')
            .attr('class', 'percentage-bar-labels')
            .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
            .attr('dx', 10)
            .attr('fill', 'grey')
            .attr('font-size', 10)
            .text(d => d.properties.name);

        perCapitaAxisCity.attr('transform', `translate(5, ${(barHeight + 4) * percentRegSelected.size + 5})`)
    });

    // ---------- SPEEDOMETER ----------

    let r = 200;
    const speedHeight = 200,
        minAngle = -80,
        maxAngle = 80,
        arcWidth = 40,
        arcInset = 20,
        numTicks = 5,
        labelInset = 10,
        pointerWidth = 10,
        pointerTailLength = 5,
        pointerHeadLengthPercent = 0.9;
    let range = maxAngle - minAngle;
    const centerTx = `translate(${width / 4}, ${r - 20})`;
    let pointerHeadLength = Math.round(r * pointerHeadLengthPercent);

    let arc = d3.arc()
        .innerRadius(r - arcWidth - arcInset)
        .outerRadius(r - arcInset)
        .startAngle((d, i) => deg2rad(minAngle + (d * i * range)))
        .endAngle((d, i) => deg2rad(minAngle + (d * (i + 1) * range)));

    let scale = d3.scaleLinear().domain([0, 1]).range([0, 1]);
    let ticks = scale.ticks(numTicks);
    let tickData = d3.range(ticks.length).map(() => 1 / ticks.length);

    // let donut = d3.layout.pie();

    let pointer;
    let speedSvg;
    console.log(width/2)

    const renderSpeedometer = (newValue, countyName) => {
        speedSvg = d3.select("#speedometer-container").append('svg')
            .attr('width', width / 2)
            .attr('height', speedHeight)

        speedSvg.append('text')
            .attr('x', width / 4)
            .attr('y', speedHeight - r / 2)
            .attr('font-size', 18)
            .attr('color', '#31343d')
            .attr('text-anchor', 'middle')
            .text(countyName || "Select a county")

        if (isZoomed) {
            speedSvg.append('text')
                .attr('x', width / 4)
                .attr('y', speedHeight - r / 2)
                .attr('dy', 20)
                .attr('font-size', 12)
                .attr('color', '#31343d')
                .attr('text-anchor', 'middle')
                .text('# registrants per day')
        }

        const arcs = speedSvg.append('g')
            .attr('class', 'arc')
            .attr('transform', centerTx)

        arcs.selectAll('path')
            .data(tickData)
            .enter().append('path')
            .attr('fill', (d, i) => arcColorFn(d * i))
            .attr('d', arc);

        const lg = speedSvg.append('g')
            .attr('class', 'label')
            .attr('transform', centerTx)

        if (isZoomed) {
            lg.selectAll('text')
                .data(ticks)
                .enter().append('text')
                .attr('transform', d => {
                    const ratio = scale(d)
                    const newAngle = minAngle + (ratio * range)
                    return `rotate(${newAngle}) translate(0, ${labelInset - r})`
                })
                .text(d3.format('d'))
        }

        const lineData = [
            [pointerWidth / 2, 0],
            [0, -pointerHeadLength],
            [-(pointerWidth / 2), 0],
            [0, pointerTailLength],
            [pointerWidth / 2, 0]
        ];
        const pointerLine = d3.line().curve(d3.curveMonotoneX);
        const pg = speedSvg.append('g').data([lineData])
            .attr('class', 'pointer')
            .attr('transform', centerTx);

        pointer = pg.append('path')
            .attr('d', pointerLine)
            .attr('transform', `rotate(${minAngle})`);

        updateSpeedometerPointer(newValue || 0);
    }

    const updateSpeedometerPointer = (newValue) => {
        const ratio = scale(currentDateIndex === 0 ? 0 : newValue);
        const newAngle = minAngle + (ratio * range);
        pointer.transition()
            .duration(stepTime*0.9)
            .attr('transform', `rotate(${newAngle})`);
    }

    const updateSpeedometer = (newValue, countyName, newMaxRegistrants) => {
        scale = d3.scaleLinear().domain([0, newMaxRegistrants]).range([0, 1]);
        ticks = scale.ticks(numTicks);
        tickData = d3.range(ticks.length-1).map(() => 1 / (ticks.length-1));
        speedSvg?.remove()
        renderSpeedometer(newValue, countyName)
    }

    updateSpeedometer(0, "", 1);
}
