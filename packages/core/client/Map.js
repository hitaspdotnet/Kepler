/*
	Module for main map

	//TODO include Leaflet.GeometryUtil

	//jsdoc: https://github.com/spadgos/sublime-jsdocs
*/
/**
 * [Map description]
 * @type {Object}
 */
Kepler.Map = {
	/**
	 * [map description]
	 * @type {[type]}
	 */
	map: null,
	options: {},
	layers: {},
	controls: {},
	items: [],

	_deps: {
		ready: new ReactiveVar(false),
		bbox: new Tracker.Dependency()
	},
	/**
	 * [ready description]
	 * @param  {[type]} val [description]
	 * @return {[type]}     [description]
	 */
	ready: function(val) {
		if(!_.isUndefined(val))
			this._deps.ready.set(val);
		return this._deps.ready.get();
	},
	/**
	 * [init description]
	 * @param  {[type]}   div  [description]
	 * @param  {[type]}   opts [description]
	 * @param  {Function} cb   [description]
	 * @return {[type]}        [description]
	 */
	init: function(div, opts, cb) {

		var self = this;

		if(self.ready())
			return this;
		else
			self.ready(true);

		self.sidebar = $('#sidebar');

		self.options = self.setOpts(opts);

		self.map = new L.Map(div, {
			center: self.options.center,
			zoom: self.options.zoom,
			minZoom: self.options.minZoom,
			maxBounds: self.options.maxBounds,
			attributionControl: false,
			doubleClickZoom: false,
			zoomControl: false			
		});

		self.layers = self._initLayers(self.map, self.options);
		self.controls = self._initControls(self.map, self.options);

		self._addComponents();

		//Fix only for Safari event resize! when shift to fullscreen
		$(window).on('orientationchange'+(K.Util.isMobile()?'':' resize'), _.debounce(function(e) {
			$(window).scrollTop(0);
			self.map.invalidateSize(false);
		}, 1000) );

		self.map.whenReady(function() {	
			self._deps.bbox.changed();

			for(var i in self.items)
				self.addItem(self.items[i]);

			if(_.isFunction(cb))
				cb.call(self);
		})
		.on('moveend zoomend', function(e) {
			self._deps.bbox.changed();
		});

		return this;
	},
	/**
	 * [setOpts description]
	 * @param {[type]} options [description]
	 */
	setOpts: function(options) {
		if(this.ready()) {
			var opts = _.deepExtend({}, K.settings.public.map, options);

			opts.popup.autoPanPaddingTopLeft = L.point(opts.popup.autoPanPaddingTopLeft);
			opts.popup.autoPanPaddingBottomRight = L.point(opts.popup.autoPanPaddingTopLeft);

			if(!K.Util.valid.loc(options.center)){
				opts.center = K.settings.public.map.center;
				opts.zoom = K.settings.public.map.zoom;
			}
			
			if(!opts.layers[opts.layer])
				opts.layer = K.settings.public.map.layer;

			if(opts.layer && this.layers && this.layers.baselayer)
				this.layers.baselayer.setUrl( K.settings.public.map.layers[opts.layer] );
		}
		return opts;
	},
	/**
	 * [destroy description]
	 * @return {[type]} [description]
	 */
	destroy: function() {

		var l = this.layers,
			c = this.controls;

		if(this.ready()) {
			this.ready(false);

			this.items = [];

			for(var l in this.layers)
				this.map.removeLayer(this.layers[l])
			
			for(var c in this.controls)
				this.map.removeControl(this.controls[c])

			this.map.remove();	
		}
		return this;
	},

	_addComponents: function() {
		for(var l in this.layers)
			this.map.addLayer(this.layers[l]);
		
		for(var c in this.controls)
			this.map.addControl(this.controls[c]);
	},
	/**
	 * [isVisible description]
	 * @return {Boolean} [description]
	 */
	isVisible: function() {
		if(!this.ready()) return false;

		var mapw = this.map.getSize().x,
			panelw = (this.sidebar.hasClass('expanded') && this.sidebar.width()) || 0,
			viewportW = mapw - panelw;

		return viewportW > 40;
	},
	/**
	 * [setView description]
	 * @param {[type]} loc  [description]
	 * @param {[type]} zoom [description]
	 */
	setView: function(loc, zoom) {
		if(this.ready()) {
			var sidebarW = (this.sidebar.hasClass('expanded') && this.sidebar.width()) || 0;
			
			this.map.setView(loc, zoom);/*, {
				//TODO Leaflet 1.2.0 not yet implement paddingTopLeft
				//only documented
				paddingTopLeft: L.point(sidebarW,0)
			});*/
		}
		return this;
	},
	/**
	 * [fitBounds description]
	 * @param  {[type]} bbox [description]
	 * @return {[type]}      [description]
	 */
	fitBounds: function(bbox) {
		if(this.ready() && bbox.isValid()) {
			var sidebarW = (this.sidebar.hasClass('expanded') && this.sidebar.width()) || 0;
			this.map.fitBounds(bbox, {
				paddingTopLeft: L.point(sidebarW,0)
			});
		}
		return this;
	},
	/**
	 * get current bounding box of map
	 * @return {[Array,Array]} "[[sw.lat, sw.lng], [ne.lat, ne.lng]]"
	 */
	getBBox: function() {
		if(this.ready()) {
			this._deps.bbox.depend();

			var bbox = this.map.getBounds(),
				sw = bbox.getSouthWest(),
				ne = bbox.getNorthEast();

			if(this.sidebar.hasClass('expanded')) {
				var p = this.map.latLngToContainerPoint(sw);
				p.x += this.sidebar.width();
				sw = this.map.containerPointToLatLng(p);
			}

			return K.Util.geo.roundBbox([[sw.lat, sw.lng], [ne.lat, ne.lng]]);
		}
	},
	/**
	 * getCenter of the map
	 * @return {Array} location
	 */
	getCenter: function() {
		if(this.ready()){
			var ll = L.latLngBounds(this.getBBox()).getCenter();
			return [ll.lat, ll.lng];
		}
	},
	/**
	 * add instance of Place or User to map
	 * @param {Place|User} item [description]
	 */
	addItem: function(item) {
		if(this.ready() && item && item.marker) {
			if(item.type==='place')
				item.marker.addTo( this.layers.places );

			else if(item.type==='user')
				item.marker.addTo( this.layers.users );
		}
		else
			this.items.push(item);
		return this;
	},
	/**
	 * [removeItem description]
	 * @param  {[type]} item [description]
	 * @return {[type]}      [description]
	 */
	removeItem: function(item) {
		if(this.ready()) {
			if(item && item.marker)
				this.map.removeLayer(item.marker);
		}
		return this;
	},
	/**
	 * show location on map
	 * @param  {Array}    loc location to show
	 * @param  {Function} cb  callback on location shown
	 * @return {K.Map}       [description]
	 */
	showLoc: function(loc, cb) {
		if(this.ready()) {

			if(!this.isVisible())
				Session.set('showSidebar', false);
			
			if(_.isFunction(cb))
				this.map.once("moveend zoomend", cb);
			
			if(loc && K.Util.valid.loc(loc))
				this.setView( L.latLng(loc) , this.options.showLocZoom);
		}
		return this;
	},
	/**
	 * [cleanGeojson description]
	 * @return {[type]} [description]
	 */
	cleanGeojson: function() {
		this.layers.geojson.clearLayers();
		return this;
	},
	/**
	 * [addGeojson description]
	 * @param {[type]}   geoData [description]
	 * @param {[type]}   opts    [description]
	 * @param {Function} cb      [description]
	 */
	addGeojson: function(geoData, opts, cb) {
		opts = opts || {};
		cb = cb || $.noop;
		//TODO implement opts.bbox to fitbounds of contents
		var self = this;
		if(this.ready()) {

			geoData = _.isArray(geoData) ? geoData : [geoData];

			if(!this.isVisible())
				Session.set('showSidebar', false);

			this.map.closePopup();

			this.layers.geojson.clearLayers();

			for(var i in geoData) {
				if(geoData[i] && (geoData[i].features || geoData[i].feature))
					this.layers.geojson.addData(geoData[i]);
			}

			if(opts.style)
				this.layers.geojson.setStyle(opts.style);
			
			if(opts.noFitBounds) {
				cb();
			}
			else
			{
				this.map.once("moveend zoomend", cb);

				if(opts.bbox)
					self.fitBounds(bbox);
				else
					setTimeout(function() {
						self.fitBounds(self.layers.geojson.getBounds());
					},100);//geojson.addData() is slowly!
			}
			
		}
		return this;
	},
	/**
	 * hide cursor from map
	 * @return {[type]} [description]
	 */
	hideCursor: function() {
		this.layers.cursor.hide();
	},
	/**
	 * show cursor on map
	 * @param  {[type]} loc [description]
	 * @return {[type]}     [description]
	 */
	showCursor: function(loc) {
		this.layers.cursor.setLoc(loc)
	},
	/**
	 * return current location of map cursor or null if it's hidden
	 * @return {[Array]} location as array [lat,lng]
	 */
	getCursorLoc: function() {
		var loc;
		if(this.map.hasLayer(this.layers.cursor.marker)) {
			var ll = this.layers.cursor.marker.getLatLng();	
			loc = [ll.lat, ll.lng];
		}
		return loc;
	}
};