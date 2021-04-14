async function createMap() {

    // ----------- CONSTANTS & HELPERS -----------
    const width = 800;
    const height = 920;
    const barHeight = 10;
    let margin = {top: 50, right: 50, bottom: 100, left: 50};
    let moving = false;

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

    const percentRegSelected = new Set(['Ottawa', 'Lawrence', 'Jefferson', 'Hamilton', 'Medina', 'Geauga', 'Delaware', 'Erie', 'Mahoning', 'Henry']);
    console.log(percentRegSelected);

    let currentDateIndex = 0;
    let isZoomed = "";

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
        // percentageBarLabels.attr('x', d => barScale(cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name]))
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
        .attr('height', height)
        .style('margin-right', "50px");

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
        var dispatcher = d3.dispatch('click', 'dblclick');

        function cc(selection) {
            var down, tolerance = 5, last, wait = null, args;

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
        var d3rebind = function (target, source) {
            var i = 1, n = arguments.length, method;
            while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
            return target;
        };

        // Method is assumed to be a standard D3 getter-setter:
        // If passed with no arguments, gets the value.
        // If passed with arguments, sets the value and returns the target.
        function d3_rebind(target, source, method) {
            return function () {
                var value = method.apply(source, arguments);
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
            .attr("cursor", () => (isZoomed === d.properties.name) ? "zoom-out" : (isZoomed != "") ? "zoom-in" : "pointer");

        percentageBars.selectAll('rect')
            .attr("stroke", da => d.properties.name === da.properties.name ? "#444" : null)
        percentageBars.selectAll('text')
            .attr('fill', da => d.properties.name === da.properties.name ? "#444" : "grey")
            .style("font-weight", da => d.properties.name === da.properties.name ? 600 : 'normal')
        // percentageBarLabels
        //     .attr("fill", da => d.properties.name === da.properties.name ? "#444" : "grey")
        //     .style("font-weight", da => d.properties.name === da.properties.name ? 900 : "normal")
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

        percentageBars.selectAll('rect')
            .attr("stroke", null)
        percentageBars.selectAll('text')
            .attr('fill', 'grey')
            .style('font-weight', 'normal')
        // percentageBarLabels.attr("fill", "grey").style("font-weight", "normal")
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
        isZoomed = d.properties.name;
        cities.selectAll('path')
            .data(ohioCities.features.filter(city => city.properties.county === d.properties.name))
            .join('path')
            .attr('d', path)
            .on('mouseover', hoveringCityStart)
            .on('mouseout', hoveringCityEnd)

    }

    function zoomed(event) {
        const {transform} = event;
        ohio.attr("transform", transform);
        ohio.attr('stroke-width', 1 / transform.k);
    }

    // ----------- PERCENTAGE BAR CHART -----------
    const barScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width / 2 - margin.right])
        .nice();


    const svg3 = d3.select("#visualization-container")
        .append("svg")
        .attr('width', width / 2)
        .attr('height', height);

    const percentageBars = svg3.selectAll('g')
        .data(ohioCounties.features
            .sort((x, y) => d3.descending(
                x.properties.total_registrants / countyPopulations[x.properties.name],
                y.properties.total_registrants / countyPopulations[y.properties.name]
            ))
            .filter(county => percentRegSelected.has(county.properties.name)), d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
        .join('g') //Same with the positioning of the labels rather than hardcoded pixels

    percentageBars.append('rect')
        .attr('x', 0)
        .attr('y', (d, i) => i * (barHeight + 4))
        .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('height', barHeight)
        .attr('rx', 2)
        .style('fill', '#9f67fa')
        .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
        .attr('transform', 'translate(5, 2)')
        .attr('stroke-width', 2)

    percentageBars.append('text')
        .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
        .attr('dx', 10)
        .attr('fill', 'grey')
        .attr('font-size', 10)
        .text(d => d.properties.name);

    // function updatePercentBars() {

    //     bars.enter().append('rect')
    //                 .attr('x', 0)
    //                 .attr('y', (d, i) => i * (barHeight+4))
    //                 .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
    //                 .attr('height', barHeight)
    //                 .style('fill', '#9f67fa')
    //                 .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
    //                 .attr('transform', 'translate(5, 2)')
    //                 .attr('stroke-width', 2);

    //     bars.exit().remove();

    //     barLabels.enter().append('text')
    //                      .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
    //                      .attr('y', (d, i) => i * (barHeight+4) + barHeight)
    //                      .attr('dx', 10)
    //                      .attr('fill', 'grey')
    //                      .attr('font-size', 10)
    //                      .text(d => d.properties.name);

    //     barLabels.exit().remove();
    // }

    svg3.append('g')
        .attr('transform', `translate(5, ${(barHeight + 4) * 10 + 5})`) // Control translation of % pop
        .call(d3.axisBottom(barScale).tickFormat(d => d * 100))
        .append('text')
        // .attr('text-anchor', 'end')
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('x', width / 4.5 - 5) //Controls x start of % pop
        .attr('y', 30) //Controls y location relative to translate above
        .text('% of population registered')

    svg3.append('text')
        .attr('transform', `translate(${width / 2 - margin.right}, ${10}) rotate(90)`)
        .attr('text-anchor', 'center')
        .attr('fill', 'black')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Counties')

    cc.on('dblclick', function (e, d) {
        console.log("DOUBGLEEE");
        (!percentRegSelected.has(d.properties.name)) ? percentRegSelected.add(d.properties.name) : percentRegSelected.delete(d.properties.name)
        const newData = ohioCounties.features
            .sort((x, y) => {
                return d3.descending(
                    x.properties.total_registrants / countyPopulations[x.properties.name],
                    y.properties.total_registrants / countyPopulations[y.properties.name]
                )
            })
            .filter(county => percentRegSelected.has(county.properties.name));

        // percentageBarLabels
        //     .data([], d => d.properties.name)
        //     .join('text')
        const newGroup = percentageBars.selectAll('g')
            .data(newData, d => d.properties.name) //USE SET AT THE TOP TO HOLD SELECTED. ON DBLCLICK, ADD TO SELECTED. ON CLICK ON BAR, REMOVE. USE FILTER HERE TO FILTER THRU ELEMENTS FOR ONLY ONES CONTAINING NAME THAT IS IN SET. DONE.//Should eventually change with the number of counties / cities that we want to show
            .join(
                enter => enter.append('g'),
                update => update,
                exit => exit.remove()
            )
        newGroup.exit().remove()
        newGroup.enter()
            .append('rect')
            .attr('x', 0)
            .attr('y', (d, i) => i * (barHeight + 4))
            .attr('width', 50)//d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('height', barHeight)
            .attr('rx', 2)
            .style('fill', 'blue')
            .style('fill-opacity', d => calculateOpacity(formatDate(startDate), d.properties.name))
            .attr('transform', 'translate(5, 2)')
            .attr('stroke-width', 2)

        newGroup.enter()
            .append('text')
            .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
            .attr('y', (d, i) => i * (barHeight + 4) + barHeight)
            .attr('dx', 10)
            .attr('fill', 'grey')
            .attr('font-size', 10)
            .text(d => d.properties.name);
    });
}
