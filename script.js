
////////////////////////////////////////////////////////////////////////////////
// set up Leaflet map
//
var map = L.map("map", {
  zoomSnap: 0.05
}).setView([40.723, -74.000], 14.35);

function zoomToStart() {
  //map.flyTo([40.723, -74.000], 14.35);
  // flying makes many more tile requests
  map.setView([40.723, -74.000], 14.35);
  clearAddress();
  buildings.resetStyle();
}

let tileUrl = `https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}.png`;
let attributionString = '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>'
attributionString += ' &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a>'
attributionString += ' &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>'
attributionString += ' &copy; <a href="https://www.openstreetmap.org/copyright/" target="_blank">OpenStreetMap</a>'

L.tileLayer(
    tileUrl, {
    maxZoom: 19,
    attribution: attributionString
}).addTo(map);

function style(feature) {
  return {
    weight: 2.5,
    color: "#000000",
    fillOpacity: 1,
    fillColor: "#faa627"
  };
}

function onEachFeature(feature, layer) {
  layer.on({
    click: selectBuilding,
    mouseover: highlightFeature,
    mouseout: resetHighlight
  });
}

function zoomToFeature(e) {
  //map.flyToBounds(e.target.getBounds());
  // flying makes many more tile requests
  map.fitBounds(e.target.getBounds());
  updateAddress(e.target.feature.properties.osm_id);
}

function panToFeature(e) {
  map.setView(e.target.getBounds().getCenter());
}

function selectBuilding(e) {
  buildings.resetStyle();
  selectedBuildingOsmId = e.target.feature.properties.osm_id;
  updateAddress(selectedBuildingOsmId);
  // https://stackoverflow.com/questions/25773389/changing-the-style-of-each-feature-in-a-leaflet-geojson-layer
  buildings.eachLayer(function(featureInstanceLayer) {
    featureOsmId = featureInstanceLayer.feature.properties.osm_id;
    if (featureOsmId == selectedBuildingOsmId) {
      featureInstanceLayer.setStyle({fillColor:"#ff00ff"});
    }
  });
  //zoomToFeature(e);
  panToFeature(e);

}

function highlightFeature(e) {
  const bbox = e.target.getBounds();
  bbox_layer = L.rectangle(bbox);
  bbox_layer.setStyle({
    weight: 1,
    color: "#444444"
  });
  bbox_layer.addTo(map);
  bbox_layer.bringToBack();

  var ne_lat = bbox._northEast.lat;
  var ne_lng = bbox._northEast.lng;
  var sw_lat = bbox._southWest.lat;
  var sw_lng = bbox._southWest.lng;
  
  var bbox_extra_right = [
    [90, ne_lng],
    [-90, ne_lng]
  ];

  var bbox_extra_top = [
    [ne_lat, 180],
    [ne_lat, -180]
  ];

  var bbox_extra_left = [
    [90, sw_lng],
    [-90, sw_lng]
  ];

  var bbox_extra_bottom = [
    [sw_lat, 180],
    [sw_lat, -180]
  ];
  
  line_right  = L.polyline(bbox_extra_right,  {color: '#444444', weight: 1}).addTo(map);
  line_top    = L.polyline(bbox_extra_top,    {color: '#444444', weight: 1}).addTo(map);
  line_left   = L.polyline(bbox_extra_left,   {color: '#444444', weight: 1}).addTo(map);
  line_bottom = L.polyline(bbox_extra_bottom, {color: '#444444', weight: 1}).addTo(map);  
}

function resetHighlight(e) {
  map.removeLayer(bbox_layer);
  map.removeLayer(line_right);
  map.removeLayer(line_top);
  map.removeLayer(line_left);
  map.removeLayer(line_bottom);
}

const buildings = L.geoJson(datacenters_carrier_hotels, {
  style,
  onEachFeature
}).addTo(map);




////////////////////////////////////////////////////////////////////////////////
// construct building addresses
//
let building_addresses;
building_addresses = datacenters_carrier_hotels.features.map(d => ({
  "osm_id": d.properties.osm_id,
  "name": d.properties.name,
  "addr_housenumber": d.properties["addr:housenumber"],
  "addr_street": d.properties["addr:street"],
  "addr_city": d.properties["addr:city"],
  "addr_state": d.properties["addr:state"], 
  "addr_postcode": d.properties["addr:postcode"]
}));

function clearAddress () {
  const addressBox = document.getElementById("building-address");
  while (addressBox.firstChild) {
    addressBox.removeChild(addressBox.firstChild);
  }
}

function updateAddress(osm_id) {
  clearAddress();
  let address = constructAddress(osm_id);
  let addressString = "";

  if (address.addressLine1) {
    addressString += address.addressLine1;
    addressString += "<br />";
  }
  if (address.addressLine2) {
    addressString += address.addressLine2;
    addressString += "<br />";
  }
  if (address.city) {
    addressString += address.city;
    addressString += "<br />";
  }
  if (address.state) {
    addressString += address.state;
    addressString += " ";
  }
  if (address.zip) {
    addressString += address.zip;
  }

  const addressBox = document.getElementById("building-address");
  const addressPara = document.createElement("p");
  addressPara.innerHTML = addressString;
  addressBox.appendChild(addressPara);
}

function constructAddress(osm_id) {
  // return an object with keys:
  //   addressLine1
  //   addressLine2
  //   city
  //   state
  //   zip
  // 
  // the values should be either a string or null

  let osm_data = building_addresses.filter(d => d.osm_id === osm_id)[0];
  // using [0] to access the first entry of the array
  // there should only ever be one item in the array
  // unless a duplicate osm_id slips in somehow

  let addressName = osm_data.name ? osm_data.name : null;

  let addressHousenumberStreet = "";
  if (osm_data.addr_housenumber) {
    addressHousenumberStreet += osm_data.addr_housenumber;
  }
  if (osm_data.addr_street) {
    addressHousenumberStreet += " " + osm_data.addr_street;
  }

  // dedupe the first two address lines in instances 
  // where "name" is the same as "housenumber + street"
  let addressLine1;
  let addressLine2;
  if (addressName == addressHousenumberStreet) {
    addressLine1 = addressName;
    addressLine2 = null;
  }
  else {
    addressLine1 = addressName;
    if (addressHousenumberStreet.length) {
      addressLine2 = addressHousenumberStreet;
    }
    else {
      addressLine2 = null;
    }
  }

  let city = osm_data.addr_city ? osm_data.addr_city : null;
  let state = osm_data.addr_state ? osm_data.addr_state : null;
  let zip = osm_data.addr_postcode ? osm_data.addr_postcode : null;

  return ({
    "addressLine1": addressLine1,
    "addressLine2": addressLine2,
    "city": city,
    "state": state,
    "zip": zip
  });
}

