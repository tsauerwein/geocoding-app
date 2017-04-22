(function() {
  var MainController = function($scope) {
    this.$scope_ = $scope;
    this.map_ = this.createMap_();
    this.poiSource_ = new ol.source.Vector();
    this.createOverlay_(this.map_, this.poiSource_);
    this.results = null;
    this.loading = false;
    this.selectedPlace = null;
    $('#search-form').submit(this.search_.bind(this));
  };

  MainController.prototype.createMap_ = function() {
    return new ol.Map({
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM()
          // source: new ol.source.XYZ({
          //   attributions: [
          //     new ol.Attribution({
          //       html: '<a href="http://www.arcgis.com/home/item.html?id=c50de463235e4161b206d000587af18b"' +
          //         ' target="_blank">Esri</a>'
          //     })
          //   ],
          //   url: 'https://server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/WMTS?' +
          //     'layer=World_Topo_Map&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&' +
          //     'Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}'
          // })
        })
      ],
      target: document.getElementById('map'),
      view: new ol.View({
        center: ol.proj.fromLonLat([22.8784752, -2.7527007]),
        zoom: 5
      })
    });
  };

  MainController.prototype.createOverlay_ = function() {
    var fill = new ol.style.Fill({
      color: 'rgba(255,255,255,0.4)'
    });
    var stroke = new ol.style.Stroke({
      color: '#df0c7b',
      width: 1.25
    });
    var image = new ol.style.Circle({
      fill: fill,
      stroke: stroke,
      radius: 15
    });
    this.map_.addLayer(new ol.layer.Vector({
      source: this.poiSource_,
      style: function(feature) {
        return new ol.style.Style({
          image: image,
          text: new ol.style.Text({
            text: '' + feature.get('pos'),
            font: '15px sans-serif'
          })
        });
      }
    }));

    // display popup on click
    this.map_.on('click', function(evt) {
      var feature = this.map_.forEachFeatureAtPixel(evt.pixel,
          function(feature) {
            return feature;
          });
      if (feature) {
        this.selectedPlace = feature;
      } else {
        this.selectedPlace = null;
      }
      this.$scope_.$apply();
    }.bind(this));

    // change mouse cursor when over marker
    this.map_.on('pointermove', function(e) {
      if (e.dragging) {
        return;
      }
      var pixel = this.map_.getEventPixel(e.originalEvent);
      var hit = this.map_.hasFeatureAtPixel(pixel);
      this.map_.getTarget().style.cursor = hit ? 'pointer' : '';
    }.bind(this));
  };

  MainController.prototype.search_ = function() {
    var searchText = $('#search-text').val().trim();

    var url = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates' +
      '?SingleLine={SEARCH}&outFields=*&f=pjson' +
      '&forStorage=true&token={TOKEN}';
    // FIXME token must be generated
    var token = 'nE-dOv1N5Ahosr-4Me9vHDYPc8RbYU2eAnOtJSJr4CGghK93yqA_ZzZgi7UFQ3q8fIenQ7S5alqsKl5oQj4el9shRy-Sl6InQ5jfSmZVf4PiXW0pLrRFVWboxshEUr-w8QrpVQ6037jGTPM0dKf2oA..'

    // FIXME urlencode search text?
    url = url
      .replace('{SEARCH}', searchText)
      .replace('{TOKEN}', token);

    this.results = null;
    this.poiSource_.clear();
    this.loading = true;
    this.selectedPlace = null;
    $.getJSON(url, function(data) {
      if (data.candidates.length > 0) {
        var features = [];
        for (var i = 0; i < data.candidates.length; i++) {
          var candidate = data.candidates[i];

          var attributes = candidate.attributes;
          attributes.geometry = new ol.geom.Point(ol.proj.fromLonLat(
            [candidate.location.x, candidate.location.y]));
          attributes.bbox = ol.proj.transformExtent([
              candidate.extent.xmin, candidate.extent.ymin,
              candidate.extent.xmax, candidate.extent.ymax
            ], 'EPSG:4326', 'EPSG:3857');
          attributes.label = candidate.address;
          attributes.pos = i + 1;

          var feature = new ol.Feature(attributes);
          features.push(feature);
        }
        this.results = features;
        this.poiSource_.addFeatures(features);
        this.zoomToResults_();
      } else {
        this.results = [];
      }
      this.loading = false;
      this.$scope_.$apply();
    }.bind(this));

    return false;
  };

  MainController.prototype.clear = function() {
    $('#search-text').val('');
    this.results = null;
    this.poiSource_.clear();
    this.selectedPlace = null;
  };

  MainController.prototype.zoomToResults_ = function() {
    this.map_.getView().fit(this.poiSource_.getExtent(), {maxZoom: 10});
  };

  MainController.prototype.zoomTo = function(feature) {
    this.map_.getView().fit(feature.get('bbox'), {maxZoom: 14});
  };


  var module = angular.module('geocoderApp', []);
  module.controller('mainController', ['$scope', MainController]);


})();
