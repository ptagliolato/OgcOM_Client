/**
 * Created by paolo on 29/05/15.
 */
//var spinner=new spinner();
var endpoint="http://localhost/sos";
// TODO: non funziona il link qui sotto
//endpoint="http://sp7.irea.cnr.it/tomcat/envsos/sos";
endpoint = "http://vesk.ve.ismar.cnr.it/observations/sos";
var urlAdapterInat2SOS="http://adamassoft.it/jbossTest";
var endpoints=[endpoint,
    "http://nextdata.get-it.it/observations/sos",
    urlAdapterInat2SOS
];

// TODO: consider using CORS enabled endpoint or proxy.
console.debug("enable CORS on WMS-WFS endpoint or use a proxy");
var geoserveruri="http://vesk.ve.ismar.cnr.it/geoserver/ows";

var enablewms=false;

var gettext=gettext||function (txt){return txt};
var currentFoi = undefined, //added 20141006
    currentFois = [],
    currentProcedure = undefined;
var map, currentFoisGeoJsonLayer;//, newFoiGeoJsonLayer;



$(document).ready(function () {


    SOSs=[];
    endpoints.forEach(function(s){SOSs.push(new ritmaresk.Sos(s));});


    $("#sosEndpoint").text(endpoint);


    SOSs.forEach(function(sos){
        //TODO: remove next line (it's a workaround) when the adapter GetCapabilities will respond at the "/kvp" url
        var forceXml=false;
        if(sos.url===urlAdapterInat2SOS) {
            sos.kvp.urlGetCapabilities=function(){ return sos.url+"/GetCapabilities"; };
            var forceXml=true;

        }
        sos.GetCapabilities(null,forceXml);
    });

    //TODO: remove this
    //loadWmsCapabilities("http://geo.vliz.be/geoserver/MarineRegions/wms");
    loadMap();

});

function retrieveObservationsByFOI(foi) {
    // sosGetObservationResponsePOX2json
    console.log("*********** retrieveObservationsByFOI **************");
    var outputs = [];
    // TODO: refine this
    SOSs.forEach(function (sos){
        var output;
        if(sos.url===urlAdapterInat2SOS) {
            var pl='<sos:featureOfInterest>' + foi + '</sos:featureOfInterest>';
            output=ritmaresk.utils.swe.sosGetObservationResponsePOX2json(sos,pl);
            console.log(output);
//            output.featureOfInterest.sosurl=sos.url;

            // merge the two parts of the observation: taxo and picture
            var dest = {
                phenomenonTime: "",
                resultTime: "",
                procedure: "",
                featureOfInterest: {
                    uri: "",
                    title: ""
                },
                taxonomy: "",
                picture: ""
            };
            for ( var i = 0; i < output.observations.length; i++ ) {
                var o = output.observations[i];
                console.log(o);
                if ( o ) {
                    if ( o.observedProperty ) {
                        if (o.observedProperty == "http://rs.tdwg.org/dwc/terms/taxonID") {
                            console.log("taxo");
                            dest.phenomenonTime = o.phenomenonTime;
                            dest.resultTime = o.resultTime;
                            dest.procedure = o.procedure;
                            dest.featureOfInterest = {
                                uri: o.featureOfInterest.uri,
                                title: o.featureOfInterest.title
                            };
                            dest.taxonomy = o.result;
                        } else if ( o.observedProperty == "http://rs.tdwg.org/dwc/terms/associatedMedia" ) {
                            console.log("picture " + o.result);
                            dest.picture = o.result;
                        } else {
                        }
                    } else {
                        console.error("no observedProperty");
                    }
                } else {
                    console.error("o is null");
                }
            }

            //console.log(output.featureOfInterest);
            //var result = JSON.parse(output.textContent);
            outputs.push(dest);
        }
    });
    return outputs;//result.featureOfInterest;

}

/**
 * returns an array of FOI in json format
 * @returns {Array}
 */
function retrieveAllFeaturesOfInterest() {

    var outputs = [];
    // TODO: refine this
    SOSs.forEach(function (sos){
        var output;
        if(sos.url===urlAdapterInat2SOS) {
            var pl='<sos:spatialFilter><fes:BBOX><fes:ValueReference>sams:shape</fes:ValueReference><gml:Envelope srsName="http://www.opengis.net/def/crs/EPSG/0/4326"> <gml:lowerCorner>0 0</gml:lowerCorner>' +
        '<gml:upperCorner>60 60</gml:upperCorner> </gml:Envelope> </fes:BBOX></sos:spatialFilter>';
            output=ritmaresk.utils.swe.sosGetFeatureOfInterestResponsePOX2json(sos,pl);
        }
        else{
            output = ritmaresk.utils.swe.sosGetFeatureOfInterestResponse_2_Json(sos.kvp.urlGetFeatureOfInterest());
            //currentFois = result.featureOfInterest;
            //console.warn(result);
            //return
        }
        output.featureOfInterest.sosurl=sos.url;
        //console.log(output.featureOfInterest);
        //var result = JSON.parse(output.textContent);
        outputs.push(output.featureOfInterest);
    });
    return outputs;//result.featureOfInterest;
}

function retrieveFeatureOfInterest(sos){
    var output = ritmaresk.utils.swe.sosGetFeatureOfInterestResponse_2_Json(sos.kvp.urlGetFeatureOfInterest());
    var result = JSON.parse(output.textContent);
    return result.featureOfInterest;
}

function featureOfIInterest2GeoJson(foiJSON,groupAdditionalProperties) {
    var coll = [];
//console.warn(foiJSON);
    // REMARK: it is assumed at the moment a CRS with lat-lon order of coordinates: in geoJson the order must be reversed
    for (var i = 0; foiJSON && i < foiJSON.length; i++) {
        //console.error(foiJSON[i].sampledFeature);
        var f = {
            "type": "Feature",
            "properties": {
                "identifier": foiJSON[i].identifier,
                "id":foiJSON[i].id,
                "name": foiJSON[i].name,
                "sampledFeature": {
                    "href":foiJSON[i].sampledFeature.href,
                    "name":foiJSON[i].sampledFeature.title
                }
            },
            "geometry": {
                "type": foiJSON[i].geometry.type,
                "coordinates": [foiJSON[i].geometry.coordinates[1], foiJSON[i].geometry.coordinates[0]]
            },
            "crs": foiJSON[i].geometry.crs
        };
        if(groupAdditionalProperties){

            Object.keys(groupAdditionalProperties).map(function(k){
                f.properties[k]=groupAdditionalProperties[k];
            });

        }

        coll.push(f);
        //var o=geojLayer.addData(f);
        //console.log(JSON.stringify(f));
    }
    //console.log(JSON.stringify(coll));
    var res = {"type": "FeatureCollection", "features": coll};
    //console.log(JSON.stringify(res));
    console.log(res);
    return res;
}

function refreshGeoJsonLayer() {
    //45.42106/12.34355
    console.log("begin refresh");
    var featuresOfInterestSets=retrieveAllFeaturesOfInterest();

    currentFoisGeoJsonLayer.clearLayers();

    featuresOfInterestSets.forEach(function(fois){
        var groupAdditionalProperties={};
        groupAdditionalProperties.sosurl=fois.sosurl;
        if(fois.sosurl===urlAdapterInat2SOS){
         groupAdditionalProperties.color="red";
        }
        currentFoisGeoJsonLayer.addData(featureOfIInterest2GeoJson(fois,groupAdditionalProperties));
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

function drawObservation(foi) {
    observation = retrieveObservationsByFOI(foi);
    if ( observation.length > 0 ) {
        observation = observation[0];
        jQuery.ajaxSetup({async:false});
        if ( observation.procedure ) {
            $.get(observation.procedure + ".json").success(function(data) {

                observation.user = data;
            });
        }
        if ( observation.taxonomy ) {
            $.get(observation.taxonomy + ".json").success(function(data) {
                observation.taxonomyDetail = data;
            });
        }
    }

    jQuery.ajaxSetup({async:true});
    console.log("qui");
    console.log(observation);
    var id = isolateObservationId(foi);
    var html = "<div><h4>" + (observation.user.name ? observation.user.name : observation.user.login) + "</h4>"
             + "<img src='" + observation.picture + "'>"
             + "place guess: "+observation.featureOfInterest.title+"</br>"
             + "taxonomy: "+observation.taxonomyDetail.common_name.name+"</br>"
             + "lat: "+ "</br>"
             + "lon: "+ "</br></div>";

    console.log(id + " -> " + html);
    $("#observation_result").html(html);
}

function isolateObservationId(foi) {
    var foiParts = foi.split("/");
    var id = foiParts[4];
    return id;
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
        var isObservation = false;
        console.warn("cliccato " + JSON.stringify(feature));
        if ( feature.properties.sosurl === urlAdapterInat2SOS ) {
            isObservation = true;
        }
        var sfLabel="";
        if(feature.properties.sampledFeature.name!=="") {
            sfLabel = feature.properties.sampledFeature.name;
        }
        else if(feature.properties.sampledFeature.href!==""){
                sfLabel= feature.properties.sampledFeature.href;
        }
        else{
            sfLabel=="http://www.opengis.net/def/nil/OGC/0/unknown";
        }

        if ( isObservation ) {
            var id = isolateObservationId(feature.properties.identifier);
            /*
            return "<div id='foi_" + id + "'/>";
            */
            return "<h4>"+feature.properties.name+"<button onclick='drawObservation(\"" + feature.properties.identifier + "\")'>view observation</button></h4>"
            +"sampled feature: "+sfLabel+"</br>"
            +"source: "+feature.properties.sosurl+"</br>"
            +"lat: "+feature.geometry.coordinates[1]+ "</br>"
            +"lon: "+feature.geometry.coordinates[0]+ "</br>";
        } else {
            return "<h4>"+feature.properties.name+"</h4>"
                +"sampled feature: "+sfLabel+"</br>"
                +"source: "+feature.properties.sosurl+"</br>"
                +"lat: "+feature.geometry.coordinates[1]+ "</br>"
                +"lon: "+feature.geometry.coordinates[0]+ "</br>";

        }
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

    map.on('popupopen', function(e) {
        var marker = e.popup._source;
        console.log(marker.feature.properties.identifier);
        drawObservation(marker.feature.properties.identifier);
    });

    // --- base OSM map ---
    baseLayers["OpenStreetMap"] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
    ).addTo(map);


    //currentFois=retrieveAllFeaturesOfInterest();
    // --- load WMS layers ---
    if(enablewms) {
        ritmaresk.utils.swe.wmsGetLayers_NameTitleType(geoserveruri, false).forEach(function (l) {
            overlayMaps[l.title] = createWmsLayer(geoserveruri, l.name, map);
        });
    }


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
            //return {color: "blue"};
            return {color: feature.properties.color||"blue"};//TODO: plugin needed to manage marker colors
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup(currentFoiPopupHtml(feature)).openPopup();
        }
    };
    markers = L.markerClusterGroup();

    // TODO: refresh geoJSON layer when bbox changes.
/*
    map.on('zoomend', function() {
        // callback
    });

    map.on('dragend', function() {
        // callback
    });
*/

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

