/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/ClickableFeatures.js
 * @requires widgets/grid/FeatureGrid.js
 * @requires GeoExt/widgets/grid/FeatureSelectionModel.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = FeatureGrid
 */

/** api: (extends)
 *  plugins/ClickableFeatures.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: FeatureGrid(config)
 *
 *    Plugin for displaying vector features in a grid. Requires a
 *    :class:`gxp.plugins.FeatureManager`. Also provides a context menu for
 *    the grid.
 */   
gxp.plugins.FeatureGrid = Ext.extend(gxp.plugins.ClickableFeatures, {
    
    /** api: ptype = gxp_featuregrid */
    ptype: "gxp_featuregrid",

    /** private: property[schema]
     *  ``GeoExt.data.AttributeStore``
     */
    schema: null,

    /** api: config[showTotalResults]
     *  ``Boolean`` If set to true, the total number of records will be shown
     *  in the bottom toolbar of the grid, if available.
     */
    showTotalResults: false,
    
    /** api: config[alwaysDisplayOnMap]
     *  ``Boolean`` If set to true, the features that are shown in the grid
     *  will always be displayed on the map, and there will be no "Display on
     *  map" button in the toolbar. Default is false. If set to true, no
     *  "Display on map" button will be shown.
     */
    alwaysDisplayOnMap: false,
    
    /** api: config[displayMode]
     *  ``String`` Should we display all features on the map, or only the ones
     *  that are currently selected on the grid. Valid values are "all" and
     *  "selected". Default is "all".
     */
    displayMode: "all",
    
    /** api: config[autoExpand]
     *  ``Boolean`` If set to true, and when this tool's output is added to a
     *  container that can be expanded, it will be expanded when features are
     *  loaded. Default is false.
     */
    autoExpand: false,
    
    /** api: config[autoCollapse]
     *  ``Boolean`` If set to true, and when this tool's output is added to a
     *  container that can be collapsed, it will be collapsed when no features
     *  are to be displayed. Default is false.
     */
    autoCollapse: false,
    
    /** api: config[selectOnMap]
     *  ``Boolean`` If set to true, features can not only be selected on the
     *  grid, but also on the map, and multi-selection will be enabled. Only
     *  set to true when no feature editor or feature info tool is used with
     *  the underlying feature manager. Default is false.
     */
    selectOnMap: false,
    
    /** api: config[displayFeatureText]
     * ``String``
     * Text for feature display button (i18n).
     */
    displayFeatureText: "Display on map",

    /** api: config[zoomFirstPageTip]
     *  ``String``
     *  Tooltip string for first page action (i18n).
     */
    firstPageTip: "First page",

    /** api: config[previousPageTip]
     *  ``String``
     *  Tooltip string for previous page action (i18n).
     */
    previousPageTip: "Previous page",

    /** api: config[zoomPageExtentTip]
     *  ``String``
     *  Tooltip string for zoom to page extent action (i18n).
     */
    zoomPageExtentTip: "Zoom to page extent",
    
    refreshButtonTip:"Refresh page",
    
    alreadyEditingWarningText:"Dati jau tiek laboti. Vai aizvērt esošo labošanas logu?",

    /** api: config[nextPageTip]
     *  ``String``
     *  Tooltip string for next page action (i18n).
     */
    nextPageTip: "Next page",

    /** api: config[lastPageTip]
     *  ``String``
     *  Tooltip string for last page action (i18n).
     */
    lastPageTip: "Last page",

    /** api: config[totalMsg]
     *  ``String``
     *  String template for showing total number of records (i18n).
     */
    totalMsg: "Features {1} to {2} of {0}",

    /** api: config[featureGrid]
     * FeatureGrid widget that this plugin creates
     */
    featureGrid: null,
    
    /** api: config[selectOnVisible]
     * Use select control on map for selecting only visible features
     */
    selectOnVisible: false,
    
    featureEditor: null,
    
    editing: false,
    
    /** private: method[displayTotalResults]
     */
    displayTotalResults: function() {
        var featureManager = this.target.tools[this.featureManager];
        if (this.showTotalResults === true) {
            this.displayItem.setText(
                featureManager.numberOfFeatures !== null ? String.format(
                    this.totalMsg,
                    featureManager.numberOfFeatures,
                    featureManager.pageIndex * featureManager.maxFeatures + Math.min(featureManager.numberOfFeatures, 1),
                    Math.min((featureManager.pageIndex + 1) * featureManager.maxFeatures, featureManager.numberOfFeatures)
                ) : ""
            );
        }
    },
    
    /** api: method[addOutput]
     */
    addOutput: function(config) {
        var featureManager = this.target.tools[this.featureManager];
        var map = this.target.mapPanel.map, smCfg;
        // a minimal SelectFeature control - used just to provide select and
        // unselect, won't be added to the map unless selectOnMap is true
        this.selectControl = new OpenLayers.Control.SelectFeature(
            featureManager.featureLayer, this.initialConfig.controlOptions
        );
        
        if(this.featureEditor){
        	//reuse selectControl
        	var featureEditor = this.target.tools[this.featureEditor];
	        if (!featureEditor) {
	            throw new Error("Unable to access feature manager by id: " + this.featureEditor);
	        }
	        
	        featureEditor.selectControl = this.selectControl;
	        featureEditor.on({
	        	"featureeditable": function(editor, feature, startedit){
	        		if(startedit && !this.editing){
	        			this.featureGrid.selModel.unbind();
		        		this.editing = true;
	        		}else if(!startedit && this.editing){
	        			this.featureGrid.selModel.bind(this.selectControl);
		        		this.editing = false;
	        		}
	        	},
	        	scope:this
	        });
        }
        
        smCfg={
                rememberSelectedRow: function(model, row, record){
			 		if(record.getFeature()!=null){
			 			model.selectedFid =  record.getFeature().fid;
			 		}
			 	},
			 	clearRememberedRow: function(model, row, record){
			 		model.selectedFid = null;
			 	},
			 	selectPrevRow: function(){
			 		if(this.selectedFid!=null){
			 			var sm = this;
			 			this.grid.getStore().each(function (rec){
							
							if(rec.getFeature()!=null && sm.selectedFid == rec.getFeature().fid){
								sm.selectRecords([rec]);
								sm.grid.getView().focusRow(sm.grid.store.indexOf(rec));
								return false;
							}
						});
			 		}
			 	}
        }
        
        if (this.selectOnMap) {
             if (featureManager.paging && !this.selectOnVisible) {
                this.selectControl.events.on({
                    "activate": function() {
                        map.events.register(
                            "click", this, this.noFeatureClick
                        );
                    },
                    "deactivate": function() {
                        map.events.unregister(
                            "click", this, this.noFeatureClick
                        );
                    },
                    scope: this
                });
            }
            map.addControl(this.selectControl);
            smCfg = Ext.apply(smCfg,{
                selectControl: this.selectControl,
                autoActivateControl: false
            });
        } else {
            smCfg = Ext.apply(smCfg,{
                selectControl: this.selectControl,
                singleSelect: false,
                autoActivateControl: false,
                listeners: {
                    "beforerowselect": function() {
                        if((window.event && window.event.type == "contextmenu") ||this.selectControl.active || featureManager.featureStore.getModifiedRecords().length) {
                            return false;
                        }
                    },
                    scope: this
                }
            });
        }
        this.displayItem = new Ext.Toolbar.TextItem({});
        config = Ext.apply({
            xtype: "gxp_featuregrid",
            border: false,
            sm: new GeoExt.grid.FeatureSelectionModel(smCfg),
            autoScroll: true,
            columnMenuDisabled: !!featureManager.paging,
            bbar: (featureManager.paging ? [ {xtype: 'tbspacer', width: 20},{
                iconCls: "x-tbar-page-first",
                ref: "../firstPageButton",
                tooltip: this.firstPageTip,
                disabled: true,
                handler: function() {
                    featureManager.setPage({index: 0});
                }
            }, {
                iconCls: "x-tbar-page-prev",
                ref: "../prevPageButton",
                tooltip: this.previousPageTip,
                disabled: true,
                handler: function() {
                    featureManager.previousPage();
                }
            }, {
                iconCls: "gxp-icon-zoom-to",
                ref: "../zoomToPageButton",
                tooltip: this.zoomPageExtentTip,
                disabled: true,
                hidden: (featureManager.pagingType !== gxp.plugins.FeatureManager.QUADTREE_PAGING) ||
                    featureManager.autoZoomPage,
                handler: function() {
                    var extent = featureManager.getPageExtent();
                    if (extent !== null) {
                        map.zoomToExtent(extent);
                    }
                }
            }, {
                iconCls: "x-tbar-page-next",
                ref: "../nextPageButton",
                tooltip: this.nextPageTip,
                disabled: true,
                handler: function() {
                    featureManager.nextPage();
                }
            }, {
                iconCls: "x-tbar-page-last",
                ref: "../lastPageButton",
                tooltip: this.lastPageTip,
                disabled: true,
                handler: function() {
                    featureManager.setPage({index: "last"});
                }
            }, {xtype: 'tbspacer', width: 10}, this.displayItem] : []).concat(["->"].concat(!this.alwaysDisplayOnMap ? [{
                text: this.displayFeatureText,
                enableToggle: true,
                toggleHandler: function(btn, pressed) {
                    this.selectOnMap && this.selectControl[pressed ? "activate" : "deactivate"]();
                    featureManager[pressed ? "showLayer" : "hideLayer"](this.id, this.displayMode);
                },
                scope: this
            }] : [])),
            listeners: {
                "added": function(cmp, ownerCt) {
                    function onClear() {
                        this.displayTotalResults();
                        this.selectOnMap && this.selectControl.deactivate();
                        this.autoCollapse && typeof ownerCt.collapse == "function" &&
                            ownerCt.collapse();
                    }
                    function onPopulate() {
                        this.displayTotalResults();
                        this.selectOnMap && this.selectControl.activate();
                        this.autoExpand && typeof ownerCt.expand == "function" &&
                            ownerCt.expand();
                    }
                    featureManager.on({
                        "query": function(tool, store) {
                            if (store && store.getCount()) {
                                onPopulate.call(this);
                            } else {
                                onClear.call(this);
                            }
                        },
                        "layerchange": onClear,
                        "clearfeatures": onClear,
                        scope: this
                    });
                },
                rowdblclick : function(grid, rowIndex){
                	if(this.featureEditor){
                		var rec = grid.store.getAt(rowIndex);
		    			this.editFeature(rec.getFeature());
                	}
                },
                contextmenu: function(event) {
                    if (featureGrid.contextMenu.items.getCount() > 0) {
                        var rowIndex = featureGrid.getView().findRowIndex(event.getTarget());
                        if (rowIndex !== false) {
                            featureGrid.getSelectionModel().selectRow(rowIndex);
                            featureGrid.contextMenu.showAt(event.getXY());
                            event.stopEvent();
                        }
                    }
                },
                scope: this
            },
            contextMenu: new Ext.menu.Menu({items: []})
        }, config || {});
        var featureGrid = gxp.plugins.FeatureGrid.superclass.addOutput.call(this, config);
        
        if (this.alwaysDisplayOnMap || (this.selectOnMap === true && this.displayMode === "selected")) {
            featureManager.showLayer(this.id, this.displayMode);
        }        
       
        featureManager.paging && featureManager.on({
            "beforesetpage": function() {
                featureGrid.zoomToPageButton.disable();
            },
            "setpage": function(mgr, condition, callback, scope, pageIndex, numPages) {
                var paging = (numPages > 0);
                featureGrid.zoomToPageButton.setDisabled(!paging);
                var prev = (paging && (pageIndex !== 0));
                featureGrid.firstPageButton.setDisabled(!prev);
                featureGrid.prevPageButton.setDisabled(!prev);
                var next = (paging && (pageIndex !== numPages-1));
                featureGrid.lastPageButton.setDisabled(!next);
                featureGrid.nextPageButton.setDisabled(!next);
            },
            scope: this
        });
                
        function onLayerChange() {
            var schema = featureManager.schema,
                ignoreFields = ["feature", "state", "fid"];
            //TODO use schema instead of store to configure the fields
            schema && schema.each(function(r) {
                r.get("type").indexOf("gml:") == 0 && ignoreFields.push(r.get("name"));
            });
            featureGrid.ignoreFields = ignoreFields;
            featureGrid.setStore(featureManager.featureStore, schema);
            
            featureGrid.selModel.on("rowselect", smCfg.rememberSelectedRow, this);
            featureGrid.selModel.on("rowdeselect",  smCfg.clearRememberedRow, this);
            
            featureManager.featureStore.on("load", function(st){
							this.featureGrid.selModel.selectPrevRow();
					},this, {delay: 500});
					

            this.fireEvent("layerchange", this, null);
            
            if (!featureManager.featureStore) {
                // not a feature layer, reset toolbar
                featureGrid.lastPageButton.disable();
                featureGrid.nextPageButton.disable();
                featureGrid.firstPageButton.disable();
                featureGrid.prevPageButton.disable();
                featureGrid.zoomToPageButton.disable();
                this.displayTotalResults();
            }
        }

        if (featureManager.featureStore) {
            onLayerChange.call(this);
        } 
        featureManager.on("layerchange", onLayerChange, this);
        this.featureGrid = featureGrid;        
        return featureGrid;
    },
    
    editFeature: function(feature) {
        var featureEditor = this.target.tools[this.featureEditor];
        var edit = function() {
            //also select rec
            var sm = this.featureGrid.selModel;
            this.featureGrid.getStore().each(function(rec) {
                        if (rec.getFeature() == feature) {
                            sm.selectRecords([rec]);
                            return false;
                        }
                    });
            featureEditor.onFeatureEdit(feature);
        }
        if (this.editing) {
            Ext.MessageBox.show({
                        msg: this.alreadyEditingWarningText,
                        buttons: Ext.MessageBox.YESNOCANCEL,
                        fn: function(btn) {
                            if (btn == "yes") {
                                if(featureEditor.popup){
                                	 featureEditor.popup.on("close", edit, this, {single: true});
                                	 featureEditor.popup.close();
                                }else{
                                	edit.call(this);
                                }
                            }
                        },
                        scope: this,
                        icon: Ext.MessageBox.WARNING
                    });
        } else {
            edit.call(this);
        }
    }
                
});

Ext.preg(gxp.plugins.FeatureGrid.prototype.ptype, gxp.plugins.FeatureGrid);
