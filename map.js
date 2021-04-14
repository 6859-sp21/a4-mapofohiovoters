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
    const ohioCities = await d3.json('./data/ohio_cities.geojson')
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
        if (hoveredProperties != null) {
            updateTooltip();
        }
        handle.attr("cx", x(h));
        label
            .attr("x", x(h))
            .text(formatDate(h));
        counties.style('fill-opacity', d => cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name] / maxRegistrantsPerCapita)
        bars.attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name]))
        // bars.style('fill-opacity', d => cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name] / maxRegistrantsPerCapita)
        barLabels.attr('x', d => barScale(cumulativeSumMap[d.properties.name][formatDate(h)] / countyPopulations[d.properties.name]))
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
            return cumulativeSumMap[d.properties.name][formatDate(startDate)] / countyPopulations[d.properties.name] / maxRegistrantsPerCapita;
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
            selection.on('mousedown', function() {
                down = d3.pointer(document.body);
                last = +new Date();
                args = arguments;
            });
            selection.on('mouseup', function() {
                if (dist(down, d3.pointer(document.body)) > tolerance) {
                    return;
                } else {
                    if (wait) {
                        window.clearTimeout(wait);
                        wait = null;
                        dispatcher.apply("dblclick", this, args);
                    } else {
                        wait = window.setTimeout((function() {
                            return function() {
                                dispatcher.apply("click", this, args);
                                wait = null;
                            };
                        })(), 300);
                    }
                }
            });
        };
        // Copies a variable number of methods from source to target.
        var d3rebind = function(target, source) {
            var i = 1, n = arguments.length, method;
            while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
            return target;
        };
        
        // Method is assumed to be a standard D3 getter-setter:
        // If passed with no arguments, gets the value.
        // If passed with arguments, sets the value and returns the target.
        function d3_rebind(target, source, method) {
            return function() {
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
    cc.on('dblclick', function() {
        console.log('DOUBLE CLICK');
    });

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

    // ----------- BAR CHART -----------
    const barScale = d3.scaleLinear()
        .domain([0, 0.4])
        .range([0, width / 2 - margin.right])
        .nice();


    const svg3 = d3.select("#visualization-container")
        .append("svg")
        .attr('width', width / 2)
        .attr('height', height);

    const bars = svg3.selectAll('rect')
        .data(ohioCounties.features.sort((x, y) => {
            return d3.descending(
                x.properties.total_registrants / countyPopulations[x.properties.name],
                y.properties.total_registrants / countyPopulations[y.properties.name]
            )
        }))
        .join('rect')
        .attr('x', 0)
        .attr('y', (d, i) => i * barHeight)
        .attr('width', d => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('height', barHeight)
        .style('fill', '#9f67fa')
        .attr('transform', 'translate(5, 0)')
        .style('stroke', '#f5f6f7')

    const barLabels = svg3.selectAll('text')
        .data(ohioCounties.features)
        .join('text')
        .attr('x', (d) => barScale(cumulativeSumMap[d.properties.name][formatDate(dates[currentDateIndex])] / countyPopulations[d.properties.name]))
        .attr('y', (d, i) => i * barHeight + barHeight - 2)
        .attr('dx', 10)
        .attr('fill', 'grey')
        .attr('font-size', 10)
        .text(d => d.properties.name)

    svg3.append('g')
        .attr('transform', `translate(5, ${height - 20})`)
        .call(d3.axisBottom(barScale).tickFormat(d => d * 100))
        .append('text')
        .attr('text-anchor', 'end')
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('x', width / 2 - 5)
        .attr('y', -6)
        .text('% of population registered')

    svg3.append('text')
        .attr('transform', `translate(${width / 2 - margin.right}, ${height / 2 - 30}) rotate(90)`)
        .attr('text-anchor', 'center')
        .attr('fill', 'black')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Counties')
}
