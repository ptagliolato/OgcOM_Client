<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:sos="http://www.opengis.net/sos/2.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:om="http://www.opengis.net/om/2.0"
    xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:xlink="http://www.w3.org/1999/xlink"
    xsi:schemaLocation="http://www.opengis.net/sos/2.0 http://schemas.opengis.net/sos/2.0/sosGetObservation.xsd http://www.opengis.net/gml/3.2 http://schemas.opengis.net/gml/3.2.1/gml.xsd http://www.opengis.net/om/2.0 http://schemas.opengis.net/om/2.0/observation.xsd"
    exclude-result-prefixes="xs"
    version="2.0">
    <xsl:output media-type="application/json" omit-xml-declaration="yes"></xsl:output>
    
    <xsl:template match="om:OM_Observation">
        {
        "phenomenonTime": "<xsl:value-of select="om:phenomenonTime/gml:TimeInstant/gml:timePosition"/>",
        "resultTime": "<xsl:value-of select="om:resultTime/gml:TimeInstant/gml:timePosition"/>",
        "procedure": "<xsl:value-of select="om:procedure"/>",
        "observedProperty": "<xsl:value-of select="om:procedure"/>",
        "featureOfInterest": {
            "uri": "<xsl:value-of select="om:featureOfInterest/@xlink:href"/>",
            "title": "<xsl:value-of select="om:featureOfInterest/@xlink:title"/>"
        },
        "result": "<xsl:value-of select="om:result"/>",
        },
    </xsl:template>
    <xsl:template match="sos:GetObservationResponse">
        {
            "observations": [<xsl:apply-templates select="//om:OM_Observation"></xsl:apply-templates>]
        }
    </xsl:template>
</xsl:stylesheet>