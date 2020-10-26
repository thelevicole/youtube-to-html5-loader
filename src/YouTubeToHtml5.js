'use strict';

/**
 * Embed a YouTube video as an HTML5 <video> element.
 *
 * @param {object} options
 * @constructor
 */
function YouTubeToHtml5( options = {} ) {

    // Basic option setting.
    for ( let key in this.options ) {
        if ( key in options ) {
            this.options[ key ] = options[ key ];
        }
    }

    // Run on init
    if ( this.options.autoload ) {
        this.load();
    }
}

/**
 * Store overridable options.
 *
 * @type {object}
 */
YouTubeToHtml5.prototype.options = {
    selector: 'video[data-yt2html5]',
    attribute: 'data-yt2html5',
    formats: [ '1080p', '720p', '360p' ],
    autoload: true
};

/**
 * Internal hooks API storage.
 *
 * @type {{filters: [], actions: []}}
 */
YouTubeToHtml5.prototype.hooks = {
    filters: [],
    actions: []
};

/**
 * Get hooks by type and name. Ordered by priority.
 *
 * @param {string} type
 * @param {string} name
 * @returns {BigUint64Array|*[]}
 */
YouTubeToHtml5.prototype.getHooks = function( type, name ) {
    if ( type in this.hooks ) {
        let hooks = this.hooks[ type ].sort( ( a, b ) => a.priority - b.priority );
        return hooks.filter( el => el.name === name );
    }

    return [];
};

/**
 * Add event lister.
 *
 * @param {string} action Name of action to trigger callback on.
 * @param {function} callback
 * @param {number} priority
 */
YouTubeToHtml5.prototype.addAction = function( action, callback, priority = 10 ) {
    this.hooks.actions.push( {
        name: action,
        callback: callback,
        priority: priority
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
 */
YouTubeToHtml5.prototype.addFilter = function( filter, callback, priority = 10 ) {
    this.hooks.filters.push( {
        name: filter,
        callback: callback,
        priority: priority
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
 * @type {object}
 */
YouTubeToHtml5.prototype.itagMap = {
    18: '360p',
    22: '720p',
    37: '1080p',
    38: '3072p',
    82: '360p3d',
    83: '480p3d',
    84: '720p3d',
    85: '1080p3d',
    133: '240pna',
    134: '360pna',
    135: '480pna',
    136: '720pna',
    137: '1080pna',
    264: '1440pna',
    298: '720p60',
    299: '1080p60na',
    160: '144pna',
    139: '48kbps',
    140: '128kbps',
    141: '256kbps'
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
 * Get list of elements found with the selector.
 *
 * @returns {NodeListOf<Element>}
 */
YouTubeToHtml5.prototype.getElements = function() {
    return this.applyFilters( 'elements', document.querySelectorAll( this.options.selector ) );
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

    return this.applyFilters( 'youtube.api.endpoint', url, videoId, hostId );
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
    let result = {};

    let data = this.parseUriString( rawData );
    data.player_response = JSON.parse( data.player_response );
    data.fflags = this.parseUriString( data.fflags );

    // Internal API filter
    data = this.applyFilters( 'youtube.meta', data, rawData );

    // Get data from API
    if ( data.hasOwnProperty( 'url_encoded_fmt_stream_map' ) ) {
        streams = streams.concat( data.url_encoded_fmt_stream_map.split( ',' ).map( s => {
            return this.parseUriString( s );
        } ) );
    }

    else if ( data.player_response.streamingData && data.player_response.streamingData.formats ) {
        streams = streams.concat( data.player_response.streamingData.formats );
    }

    else if ( data.hasOwnProperty( 'adaptive_fmts' ) ) {
        streams = streams.concat( data.adaptive_fmts.split( ',' ).map( s => {
            return this.parseUriString( s );
        } ) );
    }

    else if ( data.player_response.streamingData && data.player_response.streamingData.adaptiveFormats ) {
        streams = streams.concat( data.player_response.streamingData.adaptiveFormats );
    }

    // Build results array
    streams.forEach( stream => {
        if ( this.itagMap[ stream.itag ] && stream.url ) {
            result[ this.itagMap[ stream.itag ] ] = stream.url;
        }
    } );

    return result;
};

/**
 * Run our full process. Loops through each element matching the selector.
 */
YouTubeToHtml5.prototype.load = function() {
    this.getElements().forEach( element => {
        const attribute = this.options.attribute;
        if ( element.getAttribute( attribute ) ) {
            const requestUrl = this.youtubeDataApiEndpoint( element.getAttribute( attribute ) );

            this.doAction( 'api.before', element );

            this.fetch( requestUrl ).then( response => {

                if ( response ) {

                    this.doAction( 'api.response', element, response );

                    const streams = this.parseYoutubeMeta( response );

                    if ( streams && this.options.formats ) {

                        for ( let i = 0; i < this.options.formats.length; i++ ) {
                            const format = this.options.formats[ i ];
                            if ( format in streams ) {
                                element.src = this.applyFilters( 'video.source', streams[ format ], element, format, streams );
                                break;
                            }
                        }

                    }
                }
            } ).finally( response => {
                this.doAction( 'api.end', element, response );
            } );

        }
    } );
};

if ( typeof module === 'object' && typeof module.exports === 'object' ) {
    module.exports = YouTubeToHtml5;
}
