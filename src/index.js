import "./leaflet-heat.js";
import "./d3-dsv.js";
import { stops } from "./stops.js";

var tiles_atlas = new L.tileLayer("https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=6cc9dcb943164c0ab3bedb1aa4f11f5b");
var tiles_transport = new L.tileLayer("https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6cc9dcb943164c0ab3bedb1aa4f11f5b");
var tiles_toner = new L.tileLayer("https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png");
var tiles_osm = new L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");


var currentTime = new Date();
var markerOptions = {
	radius: 8,
	fillColor: "red",
	stroke: false,
	fillOpacity: 0.8
};

var map = L.map("map", {
	zoom: 14,
	center: [21.29, -157.825],
	minZoom: 10,
	maxZoom: 16,
	fullscreenControl: true,
	timeDimension: true,
	timeDimensionOptions: {
		timeInterval: "2021-07-01 00:00/" + currentTime.toISOString(),
		period: "PT1H",
		currentTime: 1625133600000 /* 2021-07-01 00:00 HST */
		// currentTime: currentTime,
	},
	timeDimensionControl: true,
	timeDimensionControlOptions: {
		autoPlay: false,
		timeSliderDragUpdate: true,
		loopButton: true,
		speedSlider: true,
		minSpeed: 1,
		maxSpeed: 20,
		speedStep: 1,
		timeZones: ["Local"],
		playerOptions: {transitionTime: 200},
	}
});

function style_atlas() {
	if (map.hasLayer(tiles_transport)) { map.removeLayer(tiles_transport) };
	if (map.hasLayer(tiles_toner)) { map.removeLayer(tiles_toner) };
	if (map.hasLayer(tiles_osm)) { map.removeLayer(tiles_osm) };
	map.addLayer(tiles_atlas);
	btn_atlas.disable();
	btn_transport.enable();
	btn_toner.enable();
	btn_osm.enable();
}

function style_transport() {
	if (map.hasLayer(tiles_atlas)) { map.removeLayer(tiles_atlas) };
	if (map.hasLayer(tiles_toner)) { map.removeLayer(tiles_toner) };
	if (map.hasLayer(tiles_osm)) { map.removeLayer(tiles_osm) };
	map.addLayer(tiles_transport);
	btn_atlas.enable();
	btn_transport.disable();
	btn_toner.enable();
	btn_osm.enable();
}

function style_toner() {
	if (map.hasLayer(tiles_atlas)) { map.removeLayer(tiles_atlas) };
	if (map.hasLayer(tiles_transport)) { map.removeLayer(tiles_transport) };
	if (map.hasLayer(tiles_osm)) { map.removeLayer(tiles_osm) };
	map.addLayer(tiles_toner);
	btn_atlas.enable();
	btn_transport.enable();
	btn_toner.disable();
	btn_osm.enable();
}

function style_osm() {
	if (map.hasLayer(tiles_atlas)) { map.removeLayer(tiles_atlas) };
	if (map.hasLayer(tiles_transport)) { map.removeLayer(tiles_transport) };
	if (map.hasLayer(tiles_toner)) { map.removeLayer(tiles_toner) };
	map.addLayer(tiles_osm);
	btn_atlas.enable();
	btn_transport.enable();
	btn_toner.enable();
	btn_osm.disable();
}

var btn_atlas = L.easyButton( '<span>Atlas</span>', function(){style_atlas() });
var btn_transport = L.easyButton( '<span>Transport</span>', function(){style_transport() });
var btn_toner = L.easyButton( '<span>Toner</span>', function(){style_toner() });
var btn_osm = L.easyButton( '<span>OSM</span>', function(){style_osm() });
var zoomBar = L.easyBar([ btn_atlas, btn_transport, btn_toner, btn_osm], { position: 'bottomleft' });
zoomBar.addTo(map);

style_atlas();
map.attributionControl.addAttribution('Map tiles &copy; <a href="https://www.thunderforest.com/">Thunderforest</a> | Data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>');


window.addHeatLayer = function () {
	/* display overall heatmap of all points */
	if (sessionStorage.length > 0) {
		var points = JSON.parse(sessionStorage.getItem('points'));
		var points_xy_only = points.map(x => [x[2], x[1]]);
		L.heatLayer(points_xy_only, {
			minOpacity: 0.1,
			radius: 12,
			blur: 8,
		}).addTo(map);
		sessionStorage.clear();
	}
	else {
		alert("Can't display a heatmap without any file loaded!");
	}

	showHeatMap();
}

window.showHeatMap = function () {
	document.getElementsByClassName("leaflet-heatmap-layer")[0].style.visibility = "visible";
	document.getElementById("toggle").innerHTML = "Hide heatmap of all trips";
	document.getElementById("toggle").onclick = function() { hideHeatMap();return false; };
}

window.hideHeatMap = function () {
	document.getElementsByClassName("leaflet-heatmap-layer")[0].style.visibility = "hidden";
	document.getElementById("toggle").innerHTML = "Show heatmap of all trips";
	document.getElementById("toggle").onclick = function() { showHeatMap();return false; };
}

window.hideDots = function () {
	document.getElementsByClassName("leaflet-zoom-animated")[1].style.visibility = "hidden";
}

window.showDots = function () {
	document.getElementsByClassName("leaflet-zoom-animated")[1].style.visibility = "visible";
}

function addPoints(points) {
	/* add points points & associated times to map */
	var features = [];
	points.forEach(point => {
		features.push({"type": "Feature", "properties": {"time": point[0]}, "geometry": {"type": "Point", "coordinates": [parseFloat(point[1]), parseFloat(point[2])]}});
	});

	var timeSeriesGeoJson = {"features": features, "type": "FeatureCollection"};

	var tsLayer = L.geoJSON(timeSeriesGeoJson, {
		pointToLayer: function (feature, latlng) {return L.circleMarker(latlng, markerOptions)},
	});

	var geoJson = L.timeDimension.layer.geoJson(tsLayer, {
		duration: "PT1S", // disappear (1 sec) as soon as onto next one
		updateCurrentTime: true,
		updateTimeDimension: true,
		updateTimeDimensionMode: "replace", // union, replace, intersect, extremes
	});
	geoJson.addTo(map);
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
		let dt = new Date(date + " " + time);

		let loc = d.Location;
		if (loc == "Institutional Website" ||
			loc == "Call Center (CRM)" ||
			loc == "TheBus - Default Stop - 9999") {
			return; // skip loop iteration
		}
		let hyphen_idx = loc.lastIndexOf("- ");
		let stop_id = loc.substring(hyphen_idx + 2);

		let coords = getGpsCoords(stop_id);
		let comma_idx = coords.indexOf(",");
		let coord_lng = coords.substring(comma_idx + 1);
		let coord_lat = coords.substring(0, comma_idx);

		const pin = [dt, coord_lng, coord_lat];
		points.push(pin);
	});
	// points.reverse(); // oldest first

	sessionStorage.setItem('points', JSON.stringify(points));
	addPoints(points);
}

var filesInput = document.getElementById("file");
filesInput.addEventListener("change", function (event) {
	var files = event.target.files;
	var file = files[0];
	var reader = new FileReader();
	reader.addEventListener("load", function (event) {
		var textFile = event.target;
		parse(textFile.result);
		hideDots();
		addHeatLayer();
	});
	reader.readAsText(file);
});