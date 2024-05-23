// Construct graph from ID and put it on the corresponding SVG
function getEL(d) {
	var width = 250;
	var height = 250;
	
	// Variables
	$("#Id").html("Graph " + d.Id);

	d.isothermal = +d['isothermal'];
	d.degree_std = +d['degree_std'];


	var dict = {maxUT: d.maxUT, rmaxUT: d.rmaxUT,
							maxCT: d.maxCT, rmaxCT: d.rmaxCT
						};
	var formater = d3.format(".12f");
	for(key in dict)
		$("#" + key).html(formater(dict[key]));
	
	// Update graph
	var svgGraph = d3.select("#graph");
	svgGraph.selectAll("*").remove();
	svgGraph.attr("width", width)
					.attr("height", height);

	links = [];
	
	var u = 0;
	var v = 1;
	var pos = 1;
	var binId = Number(d.Id).toString(2);
	while(u < 10) {
		if(binId.length < pos) break;
		if(binId[binId.length - pos] === "1") links.push({'source':u, 'target':v});
		pos++;
		if( ++v > 10 ){ u++; v = u+1; }
	}
	
	// Compute the distinct nodes from the links.
	var nodes = {};
	links.forEach(function(link) {
		link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
		link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
	});
	
	var force = d3.layout.force()
			.nodes(d3.values(nodes))
			.links(links)
			.size([width, height])
			.linkDistance(60)
			.charge(-300)
			.on("tick", tick)
			.start();
	
	var link = svgGraph.selectAll(".link")
			.data(force.links())
		.enter().append("line")
			.attr("class", "link");
			
	var node = svgGraph.selectAll(".node")
			.data(force.nodes())
		.enter().append("circle")
			.attr("r", 8)
			.attr("class", "node")
			.call(force.drag);
	
	function tick() {
		link.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });
		node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
	}
};

// Scatter plot
d3.csv("data/maxtimes.csv", function(error, dataset) {
	if (error) throw error;
	
	//Width and height
	var margin = {top: 80, right: 80, bottom: 60, left: 60},
	width = 640 - margin.left - margin.right,
	height = 500 - margin.top - margin.bottom;
	var centered = undefined;
	
	//Create SVG element	
	var svg = d3.select("#scatter")
		.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	var defs = svg.append("defs");
//	var linearGradient = defs.append("linearGradient")
//			.attr("id", "colorbar");
	defs.append("clipPath")
			.attr("id", "clip")
		.append("rect")
			.attr("width", width)
			.attr("height", height);
	
	// Parse data
	dataset.forEach(function(d) {
		d.Id = +d['ID'];
		d.rmaxUT = +d['rmaxUT'];
		d.rmaxCT = +d['rmaxCT'];
		d.maxUT = +d['maxUT'];
		d.maxCT = +d['maxCT'];
		d.isothermal = +d['isothermal'];
		d.degree_std = +d['degree_std'];
	});
	
	//A color scale
	var minp = 0 //Math.floor(d3.min(dataset, function(d) { return d['p']; }) * 100)/100;
	var maxp = 1; // d3.max(dataset, function(d) { return d['p']; });
	var colorList = ["#2c7bb6", "#00a6ca","#00ccbc","#90eb9d","#ffff8c","#f9d057","#f29e2e","#e76818","#d7191c"];
	var domain = []
	for(var i=0; i<colorList.length; i++) domain.push((maxp-minp) * i / (colorList.length-1) + minp);
	var colorScale = d3.scale.linear()
		.domain(domain)
		.range(colorList);
	var colorScalePos = d3.scale.linear().domain([maxp,minp]).range([0,height]);
	
	
	/// Set Scales and Distortions
	var xScale = d3.scale.linear()//log()
		.domain([0.97*d3.min(dataset, function(d) { return d.rmaxCT; }), 
						 1.03*d3.max(dataset, function(d) { return d.rmaxCT; })])
		.range([0, width]);

	var yScale = d3.scale.linear()
		.domain([0.9*d3.min(dataset, function(d) { return d.rmaxUT; }), 
						 1.1*d3.max(dataset, function(d) { return d.rmaxUT; })])
		.range([height,0]);

	var container = svg.append("g")
		.call(d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 25]).on("zoom", redraw));

	var rect = container.append("rect")
		.attr("class", "background")
		.attr("pointer-events", "all")
		.attr("fill","none")
		.attr("width", width)
		.attr("height", height);
		
	var circles = container.selectAll("circle")
		.data(dataset)
		.enter()
		.append("circle")
		.attr("clip-path", "url(#clip)")
		.attr("class", "dot")
		.attr("r", 6)
		.style("fill", function(d){ return colorScale(d.isothermal); })
		.on('click', function(d){
			getEL(d);
			$(".touched").removeClass("touched");
			$(this).addClass("touched");
		});
	
    var make_x_axis = function () {
        return d3.svg.axis()
                 .scale(xScale)
                 .orient("bottom")
                 .ticks(10)
                 .tickSize(-height);
    };

    var make_y_axis = function () {
        return d3.svg.axis()
                 .scale(yScale)
                 .orient("left")
                 .ticks(10)
                 .tickSize(-width);
    };
  
	// Define X axis
	var xAxis = make_x_axis();
		
	// Define Y axis
	var yAxis = make_y_axis();
		
	// Create X axis
	svg.append("g")
		.attr("class", "axis x")
		.attr("transform", "translate(0," + (height) + ")")
		.call(xAxis);
	// Create Y axis
	svg.append("g")
		.attr("class", "axis y")
		.attr("transform", "translate(" + 0 + ",0)")
		.call(yAxis);
		
	// Add Label to X Axis
	svg.append("text")
		.attr("class", "label")
		.attr("text-anchor", "middle")
		.attr("x", width - width/2).attr("y", height + 2*margin.bottom/3)
		.text("r where maximal conditional time is achieved");
		
	// Add label to Y Axis
	svg.append("text")
		.attr("class", "label")
		.attr("text-anchor", "middle")
		.attr("x", 0 - (height/2)).attr("y", -margin.left + 5)
		.attr("dy", "1em")
		.attr("transform", "rotate(-90)")
		.text("r where maximal unconditional time is achieved");
		
	// Add title 
	svg.append("text")
		.attr("class", "title")
		.attr("text-anchor","middle")
		.attr("x", width/2).attr("y", -margin.top/2)
		.text("Proliferation max times conditional vs unconditional for order 6 graphs");
		
	// Add subtitle 
	svg.append("text")
		.attr("class", "subtitle")
		.attr("text-anchor","middle")
		.attr("x", width/2).attr("y", -margin.top/2 + 15)
		.text("Scroll and drag to zoom/pan, click for details.");
	
	// Add color bar
	//var colorbar = svg.append("g")
	//	.attr("id", "colorbar")
	//	.attr("transform", "translate(" + (width+10) + ",0)");
	
	//colorbar.selectAll("text")
	//	.data(colorScale.domain())
	//	.enter()
	//	.append("text")
	//	.attr("class", "ticks")
	//	.attr("x", 15).attr("y", function(d){ return colorScalePos(d)})
	//	.attr("dy", ".35em")
	//	.style("text-anchor", "start")
	//	.text(function(d) { return d3.format(".2f")(d); });
		
	//colorbar.append("rect")
	//	.attr("width", 10)
	//	.attr("height", height)
	//	.attr("fill", "url(#colorbar)");
	
	//colorbar.append("text")
	//	.attr("class", "label")
	//	.attr("text-anchor","middle")
	//	.attr("x", -(height/2)).attr("y", 45)
	//	.attr("dy", "1em")
	//	.attr("transform", "rotate(-90)")
	//	.text("Graph density");
	
	//Append multiple color stops by using D3's data/enter step
	//linearGradient
	//	.attr("x1", "0%").attr("x2", "0%")
	//	.attr("y1", "100%").attr("y2", "0%")
	//	.selectAll("stop")
	//	.data( colorScale.range() )
	//	.enter().append("stop")
	//	.attr("offset", function(d,i) { return i/(colorScale.range().length-1); })
	//	.attr("stop-color", function(d) { return d; });
	
	// Zoom/pan behavior:
	function redraw() {
		if (d3.event){
			svg.select(".x.axis").call(xAxis);
			svg.select(".y.axis").call(yAxis);
		}
		
		svg.select(".x.grid")
		    .call(
		    	make_x_axis()
		    	.tickSize(-height, 0, 0)
		    	.tickFormat("")
		    	);
		svg.select(".y.grid")
		    .call(make_y_axis()
		    	.tickSize(-width, 0, 0)
		    	.tickFormat("")
		    	);
    
		circles.transition().duration(0)
			.attr("cx", function(d) {
				return xScale(d.rmaxCT);
			})
			.attr("cy", function(d) {
				return yScale(d.rmaxUT);
			});
	}; 
	
	redraw(); 
});
