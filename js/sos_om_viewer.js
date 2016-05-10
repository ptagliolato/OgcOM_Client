/**
 * Created by paolo on 29/05/15.
 */
//var spinner=new spinner();
var endpoint="http://localhost/sos";
endpoint="http://test-sk.irea.cnr.it/observations/sos";
var endpoints=[endpoint,"http://nextdata.get-it.it/observations/sos"];

// TODO: consider using CORS enabled endpoint or proxy.
console.debug("enable CORS on WMS-WFS endpoint or use a proxy");
var geoserveruri="http://test-sk.irea.cnr.it/geoserver/ows";


var gettext=gettext||function (txt){return txt};
var currentFoi = undefined, //added 20141006
    currentFois = [],
    currentProcedure = undefined;
var map, currentFoisGeoJsonLayer;//, newFoiGeoJsonLayer;



$(document).ready(function () {


    SOSs=[];
    endpoints.forEach(function(s){SOSs.push(new ritmaresk.Sos(s));});


    $("#sosEndpoint").text(endpoint);


    SOSs.forEach(function(sos){sos.GetCapabilities();});

    //TODO: remove this
    //loadWmsCapabilities("http://geo.vliz.be/geoserver/MarineRegions/wms");
    loadMap();

});

/**
 * returns an array of FOI in json format
 * @returns {Array}
 */
function retrieveAllFeaturesOfInterest() {
    var fois2Json = ritmaresk.utils.swe.sosGetFeatureOfInterestResponse_2_Json;

    var outputs = [];
    // TODO: optimize this
    SOSs.forEach(function (sos){
        var output = fois2Json(sos.kvp.urlGetFeatureOfInterest());
        var result = JSON.parse(output.textContent);
        //currentFois = result.featureOfInterest;
        //console.warn(result);
        //return
        outputs.push(result.featureOfInterest);


    });
    return outputs;//result.featureOfInterest;
}

function retrieveFeatureOfInterest(sos){
    var output = ritmaresk.utils.swe.sosGetFeatureOfInterestResponse_2_Json(sos.kvp.urlGetFeatureOfInterest());
    var result = JSON.parse(output.textContent);
    return result.featureOfInterest;
}

function featureOfIInterest2GeoJson(foiJSON) {
    var coll = [];
    // REMARK: it is assumed at the moment a CRS with lat-lon order of coordinates: in geoJson the order must be reversed
    for (var i = 0; foiJSON && i < foiJSON.length; i++) {
        var f = {
            "type": "Feature",
            "properties": {
                "identifier": foiJSON[i].identifier,
                "name": foiJSON[i].name
            },
            "geometry": {
                "type": foiJSON[i].geometry.type,
                "coordinates": [foiJSON[i].geometry.coordinates[1], foiJSON[i].geometry.coordinates[0]]
            },
            "crs": foiJSON[i].geometry.crs
        };

        coll.push(f);
        //var o=geojLayer.addData(f);
        //console.log(JSON.stringify(f));
    }
    console.log(JSON.stringify(coll));
    var res = {"type": "FeatureCollection", "features": coll};
    console.log(JSON.stringify(res));
    return res;
}

function refreshGeoJsonLayer() {
    //45.42106/12.34355
    console.log("begin refresh");
    var featuresOfInterestSets=retrieveAllFeaturesOfInterest();

    currentFoisGeoJsonLayer.clearLayers();

    featuresOfInterestSets.forEach(function(fois){
        currentFoisGeoJsonLayer.addData(featureOfIInterest2GeoJson(fois));
    });
    //var markers = L.markerClusterGroup();
    markers.addLayer(currentFoisGeoJsonLayer);
    //map.addLayer(markers);


    console.warn("currentFois.length:" + currentFois.length);

    if (currentFois.length > 0) {

        map.fitBounds(currentFoisGeoJsonLayer.getBounds(), {maxZoom: 15});
        // NOTE: added maxZoom in order to prevent a visualization without a base layer)
    }
    else {
        map.setView([41.8401, 12.5332], 5);
    }

    console.log("finished refresh");


    //let the layer appear!
    $('#currentFoisGeoJsonLayerLabel').click();


}

var markers;
function loadMap() {

    console.log("loading map");

    var baseLayers = {}, overlayMaps = {};

    // utility function
    function latlng2string(latlng) {
        return "(lat: " + latlng.lat + ", lon: " + latlng.lng + ")"
    }
    function currentFoiPopupHtml(feature){
        console.warn(JSON.stringify(feature));
        return "<h4>"+feature.properties.name+"</h4>"
            +"lat: "+feature.geometry.coordinates[1]+ "</br>"
            +"lon: "+feature.geometry.coordinates[0]+ "</br>";
    }
    function clickOnMapPopupHtml(latlng){
        return "<button class='btn btn-link' onclick='setCoordsForNewFoi(" + JSON.stringify(latlng) + ")'>"
            + gettext("Set this as the sampling position<br/> for the new feature") + "</button>" +
            "<br/>" + latlng2string(latlng);
    }

    // --- Init (clear and initialize map) ----
    if (map) {
        console.log("removing map");
        map.remove();
        map = undefined;
    }
    map = map || L.map('map');

    // --- base OSM map ---
    baseLayers["OpenStreetMap"] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
    ).addTo(map);


    //currentFois=retrieveAllFeaturesOfInterest();
    // --- load WMS layers ---
    ritmaresk.utils.swe.wmsGetLayers_NameTitleType(geoserveruri,false).forEach(function (l) {
        overlayMaps[l.title] = createWmsLayer(geoserveruri, l.name, map);
    });

    /*
    // popup with link to set the FoI coordinates (EPSG:4326)
    map.on('contextmenu', function onMapClick(e) {
        L.popup()
            .setLatLng(e.latlng)
            .setContent(clickOnMapPopupHtml(e.latlng))
            .openOn(map);
    });
    */

    // --- init leaflet control (overlay selection) ---
    var lcontrol = L.control.layers(baseLayers, overlayMaps).addTo(map);

    L.control.locate().addTo(map);

    /* @todo: refactor this ------- */
    // --- load existing FoI (geoJSON layer)
    currentFoisGeoJsonLayer = L.geoJson();
    currentFoisGeoJsonLayer.options = {
        style: function (feature) {
            return {color: "blue"};
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup(currentFoiPopupHtml(feature)).openPopup();
        }
    };
    markers = L.markerClusterGroup();


    lcontrol.addOverlay(
        markers,//currentFoisGeoJsonLayer,
        "<div id='currentFoisGeoJsonLayerLabel' style='display: inline-block;vertical-align:middle;color:blue;'>"+
        gettext("Available Features of Interest")+
        "</div>"
    );
    /* ----- end of refactoring -----*/

    // testing Leaflet control locate


    refreshGeoJsonLayer();
}

function addWms(uri,themap,leafletControl,onlyWfs){
    var overlayWms={};
    ritmaresk.utils.swe.wmsGetLayers_NameTitleType(uri,onlyWfs).forEach(function (l) {
        overlayWms[l.title] = createWmsLayer(uri, l.name, themap);
    });
    leafletControl.addOverlay(overlayWms);
}

/**
 * @param {string} url wms endpoint
 * @param {string} layerName as returned wms capabilities
 * @param {Leaflet.map} map
 * @returns {*}
 */
function createWmsLayer(url, layerName, themap) {
    console.log("loading wms");

    // load betterWms for handling getFeatureInfo
    var sampledFeatureWmsLayer = L.tileLayer.betterWms(url, {
        layers: layerName,
        transparent: true,
        format: 'image/png',
        info_format: 'application/json'
    });

    /**
     * returns an HTML string with (max) the first 7 wfs attributes-values of the feature
     * @param feature
     * @returns {string}
     */
    function summaryOfFeatureProperties(feature) {
        //globalFeatureDebug = feature;
        //ritmaresk.utils.debugArgs(arguments, "summaryOfFeatureProperties");
        //{Object} properties
        var res = "<ul>";
        //for(var k in Object.keys(feature.properties)){
        var propKeys=Object.keys(feature.properties);
        propKeys.slice(0,7).forEach(function (k) {
            //do not report null values
            if (feature.properties[k]) {
                //res+="<tr><td>"+k+"</td>:</tr>"+
                res += "<li><b>" + k + "</b>:" + feature.properties[k] + "</li>";
            }
        });
        if(propKeys.length>7){
            res+="<li>(...)</li>"
        }
        res += "</ul>";
        return res;
    }

    /**
     * @todo check if fids in geonode layers are actually UIDs. This is a precondition for obtaining URIs (see http://gis.stackexchange.com/questions/23006/allow-geoserver-wfs-request-by-featureid)
     * @param feature
     * @param typeName
     * @returns {geoserveruri|*}
     */
    function localWfsGetFeatureURI(feature, typeName) {
        if (typeName) return url + "?" +
            "service=WFS&version=1.0.0&request=GetFeature&typeName=" + typeName + "&FeatureId=" + feature.id + "&srsName=epsg:4326";
        else return url + "?" +
            "service=WFS&version=1.0.0&request=GetFeature&FeatureId=" + feature.id + "&srsName=epsg:4326";
    }

    //override showGetFeatureInfo
    // @todo check if it is possible to remove the need for "themap"
    sampledFeatureWmsLayer.showGetFeatureInfo = function (err, latlng, content) {
        if (content.features.length === 0)return;
        if (err) {
            console.log("error" + err);
            return;
        } // do nothing if there's an error

        var popupHtml = "<table>";
        content.features.map(function (feature) {
            popupHtml += "<tr><button class='btn btn-link' onclick='setSampledFeatureForNewFoi(\"" + localWfsGetFeatureURI(feature) + "\")' title='" + feature.id + "'>"
            + gettext("Use this as the sampled feature") + "</button>" +
            "</td></tr><tr><td>" + summaryOfFeatureProperties(feature) + "</td></tr>";
        });
        popupHtml += "</table>";

        L.popup({maxWidth: 800})
            .setLatLng(latlng)
            .setContent(popupHtml)
            .openOn(themap);
    };


    //map.
    //sampledFeatureWmsLayer.addTo(map);
    return sampledFeatureWmsLayer;

}

