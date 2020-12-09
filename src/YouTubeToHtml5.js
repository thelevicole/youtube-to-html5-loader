'use strict';

/**
 * Embed a YouTube video as an HTML5 <video> element.
 *
 * @param {object} options
 * @constructor
 */
function YouTubeToHtml5( options = {} ) {

    /**
     * Create an empty local object for storing hooks.
     *
     * @type {object}
     */
    this.hooks = {};

    /**
     * Create an empty object for storing options.
     *
     * @type {object}
     */
    this.options = {};

    // Basic option setting.
    for ( var key in this.defaultOptions ) {
        if ( key in options ) {
            this.options[ key ] = options[ key ];
        } else {
            this.options[ key ] = this.defaultOptions[ key ];
        }
    }

    // Run on init
    if ( this.options.autoload ) {
        this.load();
    }
}

/**
 * Default settable options.
 *
 * @type {object}
 */
YouTubeToHtml5.prototype.defaultOptions = {
    selector: 'video[data-yt2html5]',
    attribute: 'data-yt2html5',
    formats: '*', // Accepts an array of formats e.g. [ '1080p', '720p', '320p' ] or a single format '1080p'. Asterix for all.
    autoload: true
};

/**
 * Internal hooks API storage.
 *
 * @type {}
 */
YouTubeToHtml5.prototype.globalHooks = {};

/**
 * Get hooks by type and name. Ordered by priority.
 *
 * @param {string} type
 * @param {string} name
 * @returns {BigUint64Array|*[]}
 */
YouTubeToHtml5.prototype.getHooks = function( type, name ) {

    let hooks = [];

    if ( type in this.globalHooks ) {

        let globalHooks = this.globalHooks[ type ];
            globalHooks = globalHooks.filter( el => el.name === name );
            globalHooks = globalHooks.sort( ( a, b ) => a.priority - b.priority );

        hooks = hooks.concat( globalHooks );
    }

    if ( type in this.hooks ) {

        let localHooks = this.hooks[ type ];
            localHooks = localHooks.filter( el => el.name === name );
            localHooks = localHooks.sort( ( a, b ) => a.priority - b.priority );

        hooks = hooks.concat( localHooks );
    }

    return hooks;
};

/**
 * Get hooks by type and name. Ordered by priority.
 *
 * @param {string} type
 * @param {object} hookMeta
 */
YouTubeToHtml5.prototype.addHook = function( type, hookMeta ) {


    // Create new global hook type array.
    if ( !( type in this.globalHooks ) ) {
        this.globalHooks[ type ] = [];
    }

    // Create new local hook type array.
    if ( !( type in this.hooks ) ) {
        this.hooks[ type ] = [];
    }

    // Add to global.
    if ( 'global' in hookMeta && hookMeta.global ) {
        this.globalHooks[ type ].push( hookMeta );
    }

    // Else, add to local.
    else {
        this.hooks[ type ].push( hookMeta );
    }

};

/**
 * Add event lister.
 *
 * @param {string} action Name of action to trigger callback on.
 * @param {function} callback
 * @param {number} priority
 * @param {boolean} global True if this action should apply to all instances.
 */
YouTubeToHtml5.prototype.addAction = function( action, callback, priority = 10, global = false ) {
    this.addHook( 'actions', {
        name: action,
        callback: callback,
        priority: priority,
        global: global
    } );
};

/**
 * Trigger an action.
 *
 * @param {string} name Name of action to run.
 * @param {*} args Arguments passed to the callback function.
 */
YouTubeToHtml5.prototype.doAction = function( name, ...args ) {
    const hooks = this.getHooks( 'actions', name );
    for ( let i = 0; i < hooks.length; i++ ) {
        hooks[ i ].callback( ...args );
    }
};

/**
 * Register filter.
 *
 * @param {string} filter Name of filter to trigger callback on.
 * @param {function} callback
 * @param {number} priority
 * @param {boolean} global True if this action should apply to all instances.
 */
YouTubeToHtml5.prototype.addFilter = function( filter, callback, priority = 10, global = false ) {
    this.addHook( 'filters', {
        name: filter,
        callback: callback,
        priority: priority,
        global: global
    } );
};

/**
 * Apply all named filters to a value.
 *
 * @param {string} name Name of action to run.
 * @param {*} value The value to be mutated.
 * @param {*} args Arguments passed to the callback function.
 * @returns {*}
 */
YouTubeToHtml5.prototype.applyFilters = function( name, value, ...args ) {
    const hooks = this.getHooks( 'filters', name );
    for ( let i = 0; i < hooks.length; i++ ) {
        value = hooks[ i ].callback( value, ...args );
    }

    return value;
};

/**
 * Itag enum to type string.
 *
 * @link {https://support.google.com/youtube/answer/2853702}
 * @type {object}
 */
YouTubeToHtml5.prototype.itagMap = {
    18: '360p',
    22: '720p',
    37: '1080p',
    38: '3072p',
    82: '360p3d', // 3D
    83: '480p3d', // 3D
    84: '720p3d', // 3D
    85: '1080p3d', // 3D
    133: '240pna',
    134: '360pna',
    135: '480pna',
    136: '720pna',
    137: '1080pna',
    264: '1440pna',
    298: '720p60', // 60fps
    299: '1080p60na', // 60fps
    160: '144pna', // Audio
    139: '48kbps', // Audio
    140: '128kbps', // Audio
    141: '256kbps' // Audio
};

/**
 * Extract the Youtube ID from a URL.
 *
 * @param {string} url
 * @returns {string}
 */
YouTubeToHtml5.prototype.urlToId = function( url ) {
    const regex = /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|(?:(?:youtube-nocookie\.com\/|youtube\.com\/)(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed|v|vi|user)\/)))([a-zA-Z0-9\-_]*)/;
    const matches = url.match( regex );
    return Array.isArray( matches ) && matches[ 1 ] ? matches[ 1 ] : url;
};

/**
 * Basic GET ajax request.
 *
 * @param url
 * @returns {Promise}
 */
YouTubeToHtml5.prototype.fetch = function( url ) {
    return new Promise( ( accept, reject ) => {
        var request = new XMLHttpRequest();
        request.open( 'GET', url, true );

        request.onreadystatechange = function() {
            if ( this.readyState === 4 ) {
                if ( this.status >= 200 && this.status < 400 ) {
                    accept( this.responseText );
                } else {
                    reject( this );
                }
            }
        };

        request.send();
        request = null;
    } );
}

/**
 * Get the users defined allowed formats. Defaults to all.
 *
 * @return {string[]}
 */
YouTubeToHtml5.prototype.getAllowedFormats = function() {
    let allowedFormats = [];

    if ( Array.isArray( this.options.formats ) ) {
        allowedFormats = this.options.formats;
    } else if ( this.itagMap[ this.options.formats ] ) {
        allowedFormats = [ this.options.formats ];
    } else if ( this.options.formats === '*' ) {
        allowedFormats = Object.values( this.itagMap ).sort();
    }

    return allowedFormats;
};

/**
 * Get list of elements found with the selector.
 *
 * @param {NodeList|HTMLCollection|string} selector
 * @returns {array}
 */
YouTubeToHtml5.prototype.getElements = function( selector ) {
    var elements = null;

    if ( selector ) {
        if ( NodeList.prototype.isPrototypeOf( selector ) || HTMLCollection.prototype.isPrototypeOf( selector ) ) {
            elements = selector;
        } else if ( typeof selector === 'object' && 'nodeType' in selector && selector.nodeType ) {
            elements = [ selector ];
        } else {
            elements = document.querySelectorAll( this.options.selector );
        }
    }

    elements = Array.from( elements || '' );

    return this.applyFilters( 'elements', elements );
};

/**
 * Build API url from video id.
 *
 * @param {string} videoId
 * @returns {string}
 */
YouTubeToHtml5.prototype.youtubeDataApiEndpoint = function( videoId ) {
    const hostId = ~~( Math.random() * 33 );
    const url = `https://images${hostId}-focus-opensocial.googleusercontent.com/gadgets/proxy?container=none&url=https%3A%2F%2Fwww.youtube.com%2Fget_video_info%3Fvideo_id%3D${videoId}`;

    return this.applyFilters( 'api.endpoint', url, videoId, hostId );
};

/**
 * Parse URI encoded string.
 *
 * @param {string} string
 * @returns {array}
 */
YouTubeToHtml5.prototype.parseUriString = function( string ) {
    return string.split( '&' ).reduce( function( params, param ) {
        const paramParts = param.split( '=' ).map( function( value ) {
            return decodeURIComponent( value.replace( '+', ' ' ) );
        } );

        params[ paramParts[ 0 ] ] = paramParts[ 1 ];

        return params;
    }, {} );
};

/**
 * Parse raw YouTube response into usable data.
 *
 * @param rawData
 * @returns {object}
 */
YouTubeToHtml5.prototype.parseYoutubeMeta = function( rawData ) {

    let streams = [];
    let results = {};

    let response = this.parseUriString( rawData );
    response.player_response = JSON.parse( response.player_response );
    response.fflags = this.parseUriString( response.fflags );

    /**
     * Filter parsed API response.
     *
     * @type {object}
     */
    response = this.applyFilters( 'api.response', response, rawData );

    // Extract data from API, in order of priority
    if ( response.hasOwnProperty( 'url_encoded_fmt_stream_map' ) ) {
        streams = streams.concat( response.url_encoded_fmt_stream_map.split( ',' ).map( s => {
            return this.parseUriString( s );
        } ) );
    }

    else if ( response.hasOwnProperty( 'adaptive_fmts' ) ) {
        streams = streams.concat( response.adaptive_fmts.split( ',' ).map( s => {
            return this.parseUriString( s );
        } ) );
    }

    else if ( response.player_response.streamingData && response.player_response.streamingData.adaptiveFormats ) {
        streams = streams.concat( response.player_response.streamingData.adaptiveFormats );
    }

    else if ( response.player_response.streamingData && response.player_response.streamingData.formats ) {
        streams = streams.concat( response.player_response.streamingData.formats );
    }

    // Build results array
    streams.forEach( stream => {
        if ( this.itagMap[ stream.itag ] && stream.url ) {
            let streamType = 'unknown';
            let streamMime = 'unknown';

            // Extract stream data from mimetype.
            if ( 'mimeType' in stream ) {

                const mimeParts = stream.mimeType.match( /^(audio|video)(?:\/([^;]+);)?/i );

                if ( mimeParts[ 1 ] ) {
                    streamType = mimeParts[ 1 ];
                }

                if ( mimeParts[ 2 ] ) {
                    streamMime = mimeParts[ 2 ];
                }
            }

            results[ this.itagMap[ stream.itag ] ] = {
                url: stream.url,
                label: stream.qualityLabel || this.itagMap[ stream.itag ],
                type: streamType,
                mime: streamMime
            };
        }
    } );

    /**
     * Apply filter filter.
     *
     * @param {object} results Object containing extracted results from API response.
     * @param {object} response Parsed API response.
     *
     * @type {object}
     */
    results = this.applyFilters( 'api.results', results, response );

    return results;
};

/**
 * Run our full process. Loops through each element matching the selector.
 */
YouTubeToHtml5.prototype.load = function() {
    const elements = this.getElements( this.options.selector );

    if ( elements && elements.length ) {
        elements.forEach( element => {
            this.loadSingle( element );
        } );
    }
};

/**
 * Process a single element.
 *
 * @param {Element} element
 * @param {null|string} attr Used to override default setting.
 */
YouTubeToHtml5.prototype.loadSingle = function( element, attr = null ) {

    /**
     * Attribute name for grabbing YouTube identifier/url.
     *
     * @type {string}
     */
    const attribute = attr || this.options.attribute;

    // Check if element has attribute value
    if ( element.getAttribute( attribute ) ) {

        /**
         * Attempt extraction of YouTube video ID. Returns attribute value if no match.
         *
         * @type {string}
         */
        const videoId = this.urlToId( element.getAttribute( attribute ) );

        /**
         * Build the request URL from YouTube ID.
         *
         * @type {string}
         */
        const requestUrl = this.youtubeDataApiEndpoint( videoId );

        /**
         * Call action before request is made.
         *
         * @param {HTMLElement} element
         */
        this.doAction( 'api.before', element );

        /**
         * Make the HTTP request.
         */
        this.fetch( requestUrl ).then( response => {


            if ( response ) {

                const streams = this.parseYoutubeMeta( response );

                if ( streams ) {

                    const allowedFormats = this.getAllowedFormats();

                    // Select the default value.
                    var selectedStream = null;
                    var selectedFormat = null;
                    for ( let i = 0; i < allowedFormats.length; i++ ) {
                        const format = allowedFormats[ i ];
                        if ( format in streams ) {
                            selectedStream = streams[ format ];
                            selectedFormat = format;
                            break;
                        }
                    }

                    /**
                     * Fitler selected video stream object.
                     *
                     * @param {object} selectedStream Object containing url and label.
                     * @param {HTMLElement} element Video element.
                     * @param {string} selectedFormat Select itag value.
                     * @param {object} streams Object of itag and stream objects.
                     *
                     * @type {null|object}
                     */
                    selectedStream = this.applyFilters( 'video.stream', selectedStream, element, selectedFormat, streams );

                    /**
                     * Fitler the selected video source string.
                     *
                     * @param {string} selectedSource Source stream url.
                     * @param {object} selectedStream Stream object.
                     * @param {HTMLElement} element Video element.
                     * @param {string} selectedFormat Select itag value.
                     * @param {object} streams Object of itag and stream objects.
                     *
                     * @type {null|string}
                     */
                    element.src = this.applyFilters( 'video.source', selectedStream.url, selectedStream, element, selectedFormat, streams );
                }
            }
        } ).finally( response => {
            /**
             * Allways call action after request completion.
             *
             * @param {HTMLElement} element
             * @param {object} response
             */
            this.doAction( 'api.after', element, response );
        } );

    }
};

if ( typeof module === 'object' && typeof module.exports === 'object' ) {
    module.exports = YouTubeToHtml5;
}
