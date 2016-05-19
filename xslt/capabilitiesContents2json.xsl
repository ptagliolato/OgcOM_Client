<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:swes="http://www.opengis.net/swes/2.0"
                xmlns:sos="http://www.opengis.net/sos/2.0" xmlns:swe="http://www.opengis.net/swe/1.0.1"
                xmlns:sml="http://www.opengis.net/sensorML/1.0.1" xmlns:gml="http://www.opengis.net/gml/3.2"
                xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xmlns:skos="http://www.w3.org/2004/02/skos/core#"
                xmlns:ows="http://www.opengis.net/ows/1.1"
                exclude-result-prefixes="xs swes sos swe sml gml xlink xsi"
                version="2.0"
                xsi:schemaLocation="http://www.opengis.net/swes/2.0 http://schemas.opengis.net/swes/2.0/swes.xsd http://www.opengis.net/sos/2.0 http://schemas.opengis.net/sos/2.0/sosGetCapabilities.xsd http://www.opengis.net/gml/3.2 http://schemas.opengis.net/gml/3.2.1/gml.xsd http://www.opengis.net/ows/1.1 http://schemas.opengis.net/ows/1.1.0/owsAll.xsd">


    <xsl:output
            method="text"
            version="1.0"
            encoding="UTF-8"
            omit-xml-declaration="yes"
            indent="no"
            media-type="application/json"/>

    <xsl:template match="/">{
        "request": "GetCapabilities",
        "version": "2.0.0",
        "service": "SOS",
        "operationMetadata": {
            "operations":{
        <xsl:for-each select="//ows:Operation">
            "<xsl:value-of select="@name"/>":{
                "parameters":{
                    <xsl:for-each select="ows:Parameter">
                        "<xsl:value-of select="@name"/>":{
                            "allowedValues":[<xsl:apply-templates select="./ows:AllowedValues/ows:Value"/>
                            ]
                        }<xsl:if test="position()!=last()">,</xsl:if>
                    </xsl:for-each>
                },
                "dcp":[
                    <xsl:for-each select="ows:DCP/ows:HTTP/*">
                     {
                        "method":"<xsl:choose><xsl:when test="name()='ows:Get'">GET</xsl:when><xsl:when test="name()='ows:Post'">POST</xsl:when></xsl:choose>",
                        "href":"<xsl:value-of select="@xlink:href"/>",
                        "constraints":{
                            <xsl:for-each select=".//ows:Constraint">
                                "<xsl:value-of select="@name"/>":{
                                    "allowedValues":[
                                        <xsl:apply-templates select=".//ows:AllowedValues/ows:Value"/>
                                    ]
                                }
                            </xsl:for-each>
                        }
                     }<xsl:if test="position()!=last()">,</xsl:if>
                    </xsl:for-each>
                ]
            }<xsl:if test="position()!=last()">,</xsl:if>
        </xsl:for-each>
            }
        },
        "contents": [ <xsl:apply-templates select="//sos:ObservationOffering" />
  ]
}
    </xsl:template>


    <xsl:template name="stringArray" match="*">
            "<xsl:value-of select="."/>"<xsl:if test="position()!=last()">,</xsl:if>
    </xsl:template>

    <xsl:template name="offering" match="//sos:ObservationOffering">
    {
        "identifier": "<xsl:value-of select="./swes:identifier"/>",
        "name": "<xsl:value-of select="./swes:name"/>",
        "procedure": [ <xsl:apply-templates select="./swes:procedure"/>
        <!--<xsl:for-each select="./swes:procedure">
            "<xsl:value-of select="."/>"<xsl:if test="position()!=last()">,</xsl:if>
        </xsl:for-each>-->
        ],
        "observableProperty": [ <xsl:apply-templates select="./swes:observableProperty"/>
            <!--xsl:for-each select="./swes:observableProperty">
                "<xsl:value-of select="."/>"<xsl:if test="position()!=last()">,</xsl:if>
            </xsl:for-each-->
        ],<xsl:if test="./sos:observedArea">
        "observedArea": {
            "lowerLeft": [
            <xsl:value-of select="translate(./sos:observedArea/gml:Envelope/gml:lowerCorner,' ',',')"/>
            ],
            "upperRight": [
            <xsl:value-of select="translate(./sos:observedArea/gml:Envelope/gml:upperCorner,' ',',')"/>
            ],
            "crs": {
                "type": "link",
                    "properties": {
                        "href": "<xsl:value-of select="./sos:observedArea/gml:Envelope/@srsName"/>"
                    }
            }
        },</xsl:if><xsl:if test="./sos:phenomenonTime">
        "phenomenonTime": [
            "<xsl:value-of select="./sos:phenomenonTime//gml:beginPosition"/>",
            "<xsl:value-of select="./sos:phenomenonTime//gml:endPosition"/>"
        ],</xsl:if><xsl:if test="./sos:resultTime">
        "resultTime": [
            "<xsl:value-of select="./sos:resultTime//gml:beginPosition"/>",
            "<xsl:value-of select="./sos:resultTime//gml:endPosition"/>"
        ],</xsl:if>
        "responseFormat": [ <xsl:apply-templates select="./sos:responseFormat"/>
            <!--<xsl:for-each select="./sos:responseFormat">
                "<xsl:value-of select="."/>"<xsl:if test="position()!=last()">,</xsl:if>
            </xsl:for-each>-->
        ],
        "observationType": [ <xsl:apply-templates select="./sos:observationType"/>
            <!--xsl:for-each select="./sos:observationType">
                "<xsl:value-of select="."/>"<xsl:if test="position()!=last()">,</xsl:if>
            </xsl:for-each-->
        ],
        "featureOfInterestType": [ <xsl:apply-templates select="./sos:featureOfInterestType"/>
            <!--xsl:for-each select="./sos:featureOfInterestType">
                "<xsl:value-of select="."/>"<xsl:if test="position()!=last()">,</xsl:if>
            </xsl:for-each-->
        ],
        "procedureDescriptionFormat": [ <xsl:apply-templates select="./swes:procedureDescriptionFormat"/>
            <!--xsl:for-each select="./swes:procedureDescriptionFormat">
                "<xsl:value-of select="."/>"<xsl:if test="position()!=last()">,</xsl:if>
            </xsl:for-each-->
        ]
    }
        <xsl:if test="position()!=last()">,</xsl:if>
    </xsl:template>

</xsl:stylesheet>