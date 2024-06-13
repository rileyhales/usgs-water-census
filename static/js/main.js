const map = L.map('map').setView([40, -98], 5);
// set max zoom to 11
map.setMaxZoom(11);
// add open street map base maps
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);
// add a geojson layer found at /static/geojson/huc12_previous.json
const geojsonLayer = L.geoJSON().addTo(map);
fetch('/usgs-water-census/static/geojson/huc12.json')
  .then(response => response.json())
  .then(data => {
    geojsonLayer.addData(data);
  });
// add a click event so when the users clicks on a feature, a pop up appears to show the attributes of the boundaries
geojsonLayer.on('click', function (e) {
  const feature = e.layer.feature;
  // if map zoom is less than 9, zoom to the feature and exit
  if (map.getZoom() < 10) {
    map.flyToBounds(e.layer.getBounds());
    return;
  }
  // center the map on the feature
  map.panTo(e.latlng);
  // if there is a popup, remove it and then exit
  if (map._popup) {
    map.closePopup()
    map._popup = null
    return
  }
  fetch(`/usgs-water-census/static/json/batch_${feature.properties.f}.json`)
    .then(response => response.json())
    .then(data => {
      const dates = data['dates']
      const demand = data[feature.properties.huc12]
      const csvData = 'Date,SW_MGD,GW_MGD\n' + dates.map((date, i) => `${date},${demand['sw'][i]},${demand['gw'][i]}`).join('\n')
      // const csvData = 'Date,SW_MGD,GW_MGD\n' + Object.keys(data).map(key => `${key},${data[key]}`).join('\n');
      const popupContent = `
          <div style="display: flex; justify-content: space-between">
            <h1 style="margin: 0">HUC 12: ${feature.properties.huc12}</h1>
            <a id="download"><button>Save CSV</button></a>
          </div>
          <div id="huc-plot"></div>
        `;
      L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);
      const ll = {...e.latlng}
      ll.lat += 0.05
      map.panTo(ll);

      const download = document.getElementById('download');
      download.href = `data:text/csv;charset=utf-8,${csvData}`;
      download._target = '_blank';
      download.download = `${feature.properties.huc12}.csv`;

      const plotDiv = document.getElementById('huc-plot');
      Plotly.newPlot(plotDiv, [{
        x: dates,
        y: demand['sw'],
        type: 'scatter',
        mode: 'lines+markers',
        marker: {color: 'blue'},
        line: {color: 'blue'},
        name: 'Surface Water'
      }, {
        x: dates,
        y: demand['gw'],
        type: 'scatter',
        mode: 'lines+markers',
        marker: {color: 'red'},
        line: {color: 'red'},
        name: 'Ground Water'
      }, {
        x: dates,
        y: demand['sw'].map((sw, i) => sw + demand['gw'][i]),
        type: 'scatter',
        mode: 'lines+markers',
        marker: {color: 'green'},
        line: {color: 'green'},
        name: 'Total'

      }], {
        margin: {t: 0},
        xaxis: {title: 'Date'},
        yaxis: {title: 'MGD'}
      });
    });
})
;