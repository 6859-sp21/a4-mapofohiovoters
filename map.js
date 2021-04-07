async function createMap() {
    const ohioCounties = await d3.json('./data/final_data.json');
    const width = 1000;
    const height = 800;
    var margin = {top: 50, right: 50, bottom: 100, left: 50};

    const startDate = new Date("2016-11-03"),
        endDate = new Date("2020-10-06");

    const projection = d3.geoEquirectangular().fitExtent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]], ohioCounties);
    const path = d3.geoPath().projection(projection);

    var isZoomed = false;

    const zoom = d3.zoom()
        .scaleExtent([1, 4])
        .on('zoom', zoomed);

    const svg = d3.select("#visualization-container")
        .append("svg")
        .attr('width', width)
        .attr('height', height);

    ///

    var formatDateIntoYear = d3.timeFormat("%Y");
    var formatDate = d3.timeFormat("%m/%d/%y");


    var x = d3.scaleTime()
        .domain([startDate, endDate])
        .range([0, width - margin.right - margin.left])
        .clamp(true);

    var slider = svg.append("g")
        .attr("class", "slider")
        .attr("transform", "translate(" + margin.left + "," + (height-50) + ")");

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
                // update date/opacity
                // updateData(x.invert(event.x));
                hue(x.invert(event.x));
            }));

    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + 18 + ")")
        .selectAll("text")
        .data(x.ticks(10))
        .enter()
        .append("text")
        .attr("x", x)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .text(function (d) {
            return formatDateIntoYear(d);
        });

    var label = slider.append("text")
        .attr("class", "label")
        .attr("text-anchor", "middle")
        .text(formatDate(startDate))
        .attr("transform", "translate(0," + (-25) + ")")

    var handle = slider.insert("circle", ".track-overlay")
        .attr("class", "handle")
        .attr("r", 9);

    function updateData(h) {
        // input h: current date at which the slider is on
        var newData = dataset.filter(function(d) {
            return d.date < h
        })
        renderCounties(newData)
    }

    function renderCounties(data) {
        // re-render counties with updated data selection
    }

    function hue(h) {
        handle.attr("cx", x(h));
        label
            .attr("x", x(h))
            .text(formatDate(h));
        svg.style("background-color", d3.hsl(h / 1000000000, 0.8, 0.8));
    }

    ///

    const ohio = svg.append('g');

    const counties = ohio.append('g')
        .attr('stroke', '#f5f6f7')
        .attr('stroke-width', 1)
        .attr('fill', '#444')
        .attr('cursor', 'pointer')
        .selectAll('path')
        .data(ohioCounties.features)
        .join('path')
        .on('click', function (e, d) {
            isZoomed ? reset() : clicked(e, d, this)
        })
        .on('mouseover', hoveringStart)
        .on('mouseout', hoveringEnd)
        .attr('d', path);

    counties.append("title")
        .text(d => d.properties.name);

    function reset() {
        counties.transition().style('fill', null);
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
        )
        isZoomed = false;
    }

    function hoveringStart() {
        counties.transition().style('opacity', null);
        d3.select(this).transition().style('opacity', 0.5);
    }

    function hoveringEnd() {
        counties.transition().style('opacity', null);
    }

    function clicked(event, d, obj) {
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        event.stopPropagation();
        counties.transition().style("fill", null);
        d3.select(obj).transition().style('fill', 'blue');
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(4, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.pointer(event, svg.node())
        );
        isZoomed = true;
    }

    function zoomed(event) {
        const {transform} = event;
        ohio.attr("transform", transform);
        ohio.attr('stroke-width', 1 / transform.k);
    }
}
