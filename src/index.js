import "./leaflet-heat.js";
import "./d3-dsv.js";
import { stops } from "./stops.js";

var currentTime = new Date();
currentTime.setUTCDate(1, 0, 0, 0, 0);

// var layer = new L.StamenTileLayer("toner-lite", {detectRetina: true});
// var layer = new L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
var layer = new L.tileLayer("https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=6cc9dcb943164c0ab3bedb1aa4f11f5b");

var map = L.map("map", {
	zoom: 14,
	center: [21.285, -157.825],
	// center: [21.29, -157.40],
	minZoom: 11,
	maxZoom: 16,
	// timeDimension: true,
});
map.addLayer(layer);

map.attributionControl.addAttribution('Map tiles &copy; <a href="https://www.thunderforest.com/">Thunderforest</a> | Data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>');




// timeDimension stuff


function addHeatLayer(points) {
	/* helper function for parse() that actually does the rendering */
	const points_xy_only = points.map(x => x[1].split(',')); // no time stuff for now
	L.heatLayer(points_xy_only, {
		minOpacity: 0.1,
		radius: 12,
		blur: 8,
	}).addTo(map);
}

function getGpsCoords(stop_id) {
	/* returns gps coords in lat,lng format given a stop id */
	var regex = new RegExp("^" + stop_id + ",.+?,,(.*?),,", "m");
	var match = regex.exec(stops);
	if (match) return match[1];
	else return null;
}

function parse(csv) {
	/* adds a heatlayer to our map based on [epochtime, gps coords] arrays from user-provided csv */
	var data = d3.csvParse(csv);
	var points = [];

	data.forEach(function(d) {
		let date = d.Date;
		let time = d.Time.replace("am", " am").replace("pm", " pm");
		let dt = Date.parse(date + " " + time);

		let loc = d.Location;
		if (loc == "Institutional Website" ||
			loc == "Call Center (CRM)" ||
			loc == "TheBus - Default Stop - 9999") {
			return; // skip loop iteration
		}
		let hyphen_idx = loc.lastIndexOf("- ");
		let stop_id = loc.substring(hyphen_idx + 2);

		let coords = getGpsCoords(stop_id);

		const pin = [dt, coords];
		points.push(pin);
	});
	addHeatLayer(points);
}

var filesInput = document.getElementById("file");
filesInput.addEventListener("change", function (event) {
	var files = event.target.files;
	var file = files[0];
	var reader = new FileReader();
	reader.addEventListener("load", function (event) {
		var textFile = event.target;
		parse(textFile.result);
	});
	reader.readAsText(file);
});
