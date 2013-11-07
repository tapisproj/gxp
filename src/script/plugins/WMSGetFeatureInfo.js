/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 * @requires plugins/FeatureEditorGrid.js
 * @requires GeoExt/widgets/Popup.js
 * @requires OpenLayers/Control/WMSGetFeatureInfo.js
 * @requires OpenLayers/Format/WMSGetFeatureInfo.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = WMSGetFeatureInfo
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: WMSGetFeatureInfo(config)
 *
 *    This plugins provides an action which, when active, will issue a
 *    GetFeatureInfo request to the WMS of all layers on the map. The output
 *    will be displayed in a popup.
 */   
gxp.plugins.WMSGetFeatureInfo = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_wmsgetfeatureinfo */
    ptype: "gxp_wmsgetfeatureinfo",
    
    /** api: config[outputTarget]
     *  ``String`` Popups created by this tool are added to the map by default.
     */
    outputTarget: "map",

    /** private: property[popupCache]
     *  ``Object``
     */
    popupCache: null,

    /** api: config[infoActionTip]
     *  ``String``
     *  Text for feature info action tooltip (i18n).
     */
    infoActionTip: "Get Feature Info",

    /** api: config[popupTitle]
     *  ``String``
     *  Title for info popup (i18n).
     */
    popupTitle: "Feature Info",
    
    /** api: config[text]
     *  ``String`` Text for the GetFeatureInfo button (i18n).
     */
    buttonText: "Identify",
    
    /** api: config[format]
     *  ``String`` Either "html" or "grid". If set to "grid", GML will be
     *  requested from the server and displayed in an Ext.PropertyGrid.
     *  Otherwise, the html output from the server will be displayed as-is.
     *  Default is "html".
     */
    format: "html",
    
    /** api: config[vendorParams]
     *  ``Object``
     *  Optional object with properties to be serialized as vendor specific
     *  parameters in the requests (e.g. {buffer: 10}).
     */
    
    /** api: config[layerParams]
     *  ``Array`` List of param names that should be taken from the layer and
     *  added to the GetFeatureInfo request (e.g. ["CQL_FILTER"]).
     */
     
    /** api: config[itemConfig]
     *  ``Object`` A configuration object overriding options for the items that
     *  get added to the popup for each server response or feature. By default,
     *  each item will be configured with the following options:
     *
     *  .. code-block:: javascript
     *
     *      xtype: "propertygrid", // only for "grid" format
     *      title: feature.fid ? feature.fid : title, // just title for "html" format
     *      source: feature.attributes, // only for "grid" format
     *      html: text, // responseText from server - only for "html" format
     */

    /** api: method[addActions]
     */
    addActions: function() {
        this.popupCache = {};
        
        var updateInfo;
        var infoControls = {};
        
        var actions = gxp.plugins.WMSGetFeatureInfo.superclass.addActions.call(this, [{
            tooltip: this.infoActionTip,
            iconCls: "gxp-icon-getfeatureinfo",
            buttonText: this.buttonText,
            toggleGroup: this.toggleGroup,
            enableToggle: true,
            allowDepress: true,
            toggleHandler: function(button, pressed) {
                    if (pressed) {
                        updateInfo.call(this);
                    } else {
                        for(var k in infoControls){
                            infoControls[k].deactivate();
                        }
                    }
             },
             scope : this
        }]);
        var infoButton = this.actions[0].items[0];

        updateInfo = function() {
            //do not add controls if button is not active
            if(!infoButton.pressed) {
                return;
            }
            var queryableLayers = this.target.mapPanel.layers.queryBy(function(x){
                return (x.get("queryable") || x.get("info_sublayers")) && x.get("layer").visibility === true && x.get("layer").inRange !== false;
            });

            var map = this.target.mapPanel.map;
            
            //remove not needed controls
            for(var k in infoControls){
                var remove = true;
                queryableLayers.each(function(x){
                    if(k == x.getLayer().id){
                        remove = false;
                        return false;
                    }
                });
                if(remove){
                    var control = infoControls[k];
		            control.deactivate();
		            control.destroy();
		            delete infoControls[k];
                }
            }
            
            //add and activate not added controls
            
            queryableLayers.each(function(x){
                var layer = x.getLayer();
                var subLayers = x.get("info_sublayers");
                if(! (layer.id in infoControls)){
                    var vendorParams = Ext.apply({}, this.vendorParams), param;
	                if (this.layerParams) {
	                    for (var i=this.layerParams.length-1; i>=0; --i) {
	                        param = this.layerParams[i].toUpperCase();
	                        vendorParams[param] = layer.params[param];
	                    }
	                }
	                var infoFormat = x.get("infoFormat");
	                if (infoFormat === undefined) {
	                    // TODO: check if chosen format exists in infoFormats array
	                    // TODO: this will not work for WMS 1.3 (text/xml instead for GML)
	                    if(this.format == "html"){
	                    	infoFormat = "text/html";
	                    } else {
	                    	var gmlFormat = "application/vnd.ogc.gml";
	                    	if(x.get("infoFormats") && x.get("infoFormats").indexOf(gmlFormat) > -1){
	                    		infoFormat = gmlFormat;
	                    	} else {
	                    		infoFormat = "text/html";
	                    	}
	                    }
	                }
	                var control = new OpenLayers.Control.WMSGetFeatureInfo(Ext.applyIf({
	                    url: subLayers ? x.get("info_sublayers_url") : layer.url,
	                    layers: [layer],
	                    infoFormat: infoFormat,
	                    vendorParams: vendorParams,
	                    eventListeners: {
	                        getfeatureinfo: function(evt) {
	                            var title = x.get("title") || x.get("name");
	                            if (infoFormat == "text/html") {
	                                var match = evt.text.match(/<body[^>]*>([\s\S]*)<\/body>/);
	                                if (match && !match[1].match(/^\s*$/)) {
	                                    this.displayPopup(evt, title, match[1]);
	                                }
	                            } else if (infoFormat == "text/plain") {
	                                this.displayPopup(evt, title, '<pre>' + evt.text + '</pre>');
	                            } else if (infoFormat == "application/vnd.esri.wms_featureinfo_xml") {
	                                var xmlReader = new OpenLayers.Format.XML();
	                                var data = xmlReader.read(evt.text);
	                                var allFeatureInfos = data.documentElement.getElementsByTagName("FeatureInfo");
	                                var features = [];
							        for(var i=0; i<allFeatureInfos.length; i++) {
							            var attributes = {};
							            var fields = allFeatureInfos[i].getElementsByTagName("Field");
							            if(fields){
							            	for(var j=0; j<fields.length; j++) {
							            	    var fn = fields[j].getElementsByTagName("FieldName");
							            	    var fv = fields[j].getElementsByTagName("FieldValue");
							            	    if (fn && fn[0].childNodes.length > 0 && fv && fv[0].childNodes.length > 0) {
													attributes[fn[0].childNodes[0].nodeValue] = fv[0].childNodes[0].nodeValue;
												}
							                }
							            }
							            var feature = new OpenLayers.Feature.Vector(null, attributes);
							            features.push(feature);
							        }
							        if (features.length > 0) {
							        	evt.features = features;
	                                    this.displayPopup(evt, title, null,  x.get("getFeatureInfo"));
	                                }
	                                //this.displayPopup(evt, title, null,  x.get("getFeatureInfo"));
	                            } else if (evt.features && evt.features.length > 0) {
	                                this.displayPopup(evt, title, null,  x.get("getFeatureInfo"));
	                            }
	                            this.unRegisterPopup(evt);
	                        },
	                        beforegetfeatureinfo: function(evt) {
	                        	this.registerPopup(evt);
	                        },
	                        scope: this
	                    }
	                }, this.controlOptions));
	                if(subLayers){
	                	control.subLayers = subLayers;
	                	control.buildWMSOptions = function(url, layers, clickPosition, format){
	                		var wmsOpt = OpenLayers.Control.WMSGetFeatureInfo.prototype.buildWMSOptions.apply(this, arguments);
	                		var queryLayers = this.subLayers.split(",");
	                		wmsOpt.params.LAYERS = queryLayers;
	                		wmsOpt.params.QUERY_LAYERS = queryLayers;
	                		return wmsOpt;
	                	};
	                }
	                map.addControl(control);
	                infoControls[layer.id] = control;
                }
                
                infoControls[layer.id].activate();
                
            }, this);

        };
        
        this.target.mapPanel.layers.on("update", updateInfo, this);
        this.target.mapPanel.layers.on("add", updateInfo, this);
        this.target.mapPanel.layers.on("remove", updateInfo, this);
        this.target.mapPanel.on("afterlayervisibilitychange", updateInfo, this);
        
        return actions;
    },
    
    registerPopup: function(evt){
    	var popupKey = this.getPopupKey(evt);
    	var popup = this.popupCache[popupKey];
    	if(!popup){
    		this.displayPopup.apply(this,arguments);
    	}else if(popup.popup_closed===true){
    		delete this.popupCache[popupKey];
    		this.displayPopup.apply(this,arguments);
    	}
    	popup = this.popupCache[popupKey];
    	popup.registerFeatureRequest();
    },
    
    unRegisterPopup: function(evt){
    	var popup = this.popupCache[this.getPopupKey(evt)];
    	if(popup){
    		popup.unregisterFeatureRequest();
    	}
    },
    
    getPopupKey: function(evt){
    	return evt.xy.x + "." + evt.xy.y;
    },

    /** private: method[displayPopup]
     * :arg evt: the event object from a 
     *     :class:`OpenLayers.Control.GetFeatureInfo` control
     * :arg title: a String to use for the title of the results section 
     *     reporting the info to the user
     * :arg text: ``String`` Body text.
     */
    displayPopup: function(evt, title, text, featureinfo) {
        var popup;
        var popupKey = this.getPopupKey(evt);
        featureinfo = featureinfo || {};
        if (!(popupKey in this.popupCache)) {
            popup = this.addOutput({
                xtype: "gx_popup",
                title: this.popupTitle,
                fill: false,
                autoScroll: true,
                location: evt.xy,
                map: this.target.mapPanel,
                width: 300,
                height: 400,
                listeners: {
                    close: (function(key) {
                        return function(panel){
                        	this.popupCache[key].popup_closed=true;
                        };
                    })(popupKey),
                    scope: this
                },
                items:[{
                         xtype: 'displayfield',
                         value: "<p>&nbsp;&nbsp;&nbsp;Meklēts tiek kartē redzamajos slāņos</p>",
                         cls : "geokods-crosslayerqueryform-limit-msg",
                         hideLabel : true
                   },{
                         xtype: 'progress',
                         ref: "progress",
                         height:10
                   },{
                       ref: "info_container",
                       layout: "accordion",
                       defaults: {
                       layout: "fit",
                       autoScroll: true,
                       autoHeight: true,
                       autoWidth: true,
                       collapsible: true
                   }
                }],
                registerFeatureRequest:function(){
                	if(this.popup_closed==null || this.popup_closed===false){
                		this.registerReq++;
                	    this.progress.updateProgress(this.unRegisterReq/this.registerReq);
                	    if(this.progress.hidden){
                	    	this.progress.show();
                	    }
                	}   
                },
                unregisterFeatureRequest:function(){
                	if(this.popup_closed==null || this.popup_closed===false){
                	    this.unRegisterReq++;
                	    this.progress.updateProgress(this.unRegisterReq/this.registerReq);
                	    if(this.unRegisterReq >= this.registerReq){
                	    	this.progress.hide();
                	    }
                	}
                }
            },{});
            this.popupCache[popupKey] = popup;
            popup.registerReq = 0;
            popup.unRegisterReq = 0;
        } else {
            popup = this.popupCache[popupKey];
        }
        
        if(popup.popup_closed===true){
        	//popup is already closed
        	return;
        }

        var features = evt.features, config = [];
        if (!text && features) {
            var feature;
            for (var i=0,ii=features.length; i<ii; ++i) {
                feature = features[i];
                config.push(Ext.apply({
                    xtype: "gxp_editorgrid",
                    readOnly: true,
                    listeners: {
                        'beforeedit': function (e) {
                            return false;
                        }
                    },
                    title: feature.fid ? feature.fid : title,
                    feature: feature,
                    fields: featureinfo.fields,
                    propertyNames: featureinfo.propertyNames
                }, this.itemConfig));
            }
        } else if (text) {
            config.push({
                title: title,
                html: text,
                collapsed : true
            });
        }
        popup.info_container.add(config);
        popup.doLayout();
    }
    
});

Ext.preg(gxp.plugins.WMSGetFeatureInfo.prototype.ptype, gxp.plugins.WMSGetFeatureInfo);
