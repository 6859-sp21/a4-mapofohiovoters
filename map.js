async function createMap() {
    const ohioCounties = await d3.json('./data/final_data.json');
    const width = 1000;
    const height = 800;

    const projection = d3.geoEquirectangular().fitExtent([[0,0], [width, height]], ohioCounties);
    const path = d3.geoPath().projection(projection);

    var isZoomed = false;

    const zoom = d3.zoom()
        .scaleExtent([1, 4])
        .on('zoom', zoomed);

    const svg = d3.select("#visualization-container")
        .append("svg")
            .attr('width', width)
            .attr('height', height);

    const g = svg.append('g')
        .attr('width', '100%')
        .attr('height', '100%');

    const counties = g.append('g')
            .attr('stroke', '#f5f6f7')
            .attr('stroke-width', 1)
            .attr('fill', '#444')
            .attr('cursor', 'pointer')
            .attr('width', '100%')
            .attr('height', '100%')
        .selectAll('path')
        .data(ohioCounties.features)
        .join('path')
            .on('click', function(e, d) {
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
        g.attr("transform", transform);
        g.attr('stroke-width', 1 / transform.k);
    }
}
