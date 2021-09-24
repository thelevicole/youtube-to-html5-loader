class YouTubeToHtml5 {

    static globalHooks = {};

    static defaultOptions = {
        endpoint: 'https://yt2html5.com/?id=',
        selector: 'video[data-yt2html5]',
        attribute: 'data-yt2html5',
        formats: '*', // Accepts an array of formats e.g. [ '1080p', '720p', '320p' ] or a single format '1080p'. Asterix for all.
        autoload: true,
        withAudio: false,
        withVideo: true
    }

    class = YouTubeToHtml5;
    options = {};
    hooks = {};

    /**
     * @param {object} options
     */
    constructor(options) {
        this.options = options;

        this.addAction('load.success', this.class._actionLoadSuccess, 0);
        this.addAction('load.failed', this.class._actionLoadFailed, 0);

        if (this.getOption('autoload')) {
            this.load();
        }
    }

    /**
     * Get a user or default option.
     * @param {string} name
     * @param defaultValue
     * @returns {*}
     */
    getOption(name, defaultValue) {
        if (!defaultValue && name in this.class.defaultOptions) {
            defaultValue = this.class.defaultOptions[name];
        }

        var value = name in this.options ? this.options[name] : defaultValue;

        /**
         * Apply value filters to all regardless of option name.
         * @example instance.addFilter('option', function(value, name) { return value + 500; });
         */
        value = this.applyFilters(`option`, value, name );

        /**
         * Apply value filters to option named only.
         * @example instance.addFilter('setting.delay', function(value) { return value + 500; });
         */
        value = this.applyFilters(`option.${name}`, value );

        return value;
    }

    /**
     * Get hooks by type and name. Ordered by priority.
     * @param {string} type
     * @param {string} name
     * @returns {array}
     */
    getHooks(type, name) {
        let hooks = [];

        if (type in this.class.globalHooks) {
            let globalHooks = this.class.globalHooks[type];
            globalHooks = globalHooks.filter(el => el.name === name);
            globalHooks = globalHooks.sort((a, b) => a.priority - b.priority);
            hooks = hooks.concat(globalHooks);
        }

        if (type in this.hooks) {
            let localHooks = this.hooks[ type ];
            localHooks = localHooks.filter(el => el.name === name);
            localHooks = localHooks.sort((a, b) => a.priority - b.priority);
            hooks = hooks.concat(localHooks);
        }

        return hooks;
    }

    /**
     * Register a hook.
     * @param {string} type
     * @param {object} hookMeta
     */
    addHook(type, hookMeta) {

        // Create new global hook type array.
        if (!(type in this.class.globalHooks)) {
            this.class.globalHooks[type] = [];
        }

        // Create new local hook type array.
        if (!(type in this.hooks)) {
            this.hooks[type] = [];
        }

        // Add to global.
        if ('global' in hookMeta && hookMeta.global) {
            this.class.globalHooks[type].push(hookMeta);
        }

        // Else, add to local.
        else {
            this.hooks[type].push(hookMeta);
        }

    }

    /**
     * Add action callback.
     * @param {string} action Name of action to trigger callback on.
     * @param {function} callback
     * @param {number} priority
     * @param {boolean} global True if this action should apply to all instances.
     */
    addAction(action, callback, priority = 10, global = false) {
        this.addHook('actions', {
            name: action,
            callback: callback,
            priority: priority,
            global: global
        });
    }

    /**
     * Trigger an action.
     * @param {string} name Name of action to run.
     * @param {*} args Arguments passed to the callback function.
     */
    doAction(name, ...args) {
        this.getHooks('actions', name).forEach(hook => {
            hook.callback(this, ...args);
        });
    }

    /**
     * Register filter.
     * @param {string} filter Name of filter to trigger callback on.
     * @param {function} callback
     * @param {number} priority
     * @param {boolean} global True if this action should apply to all instances.
     */
    addFilter(filter, callback, priority = 10, global = false) {
        this.addHook('filters', {
            name: filter,
            callback: callback,
            priority: priority,
            global: global
        });
    }

    /**
     * Apply all named filters to a value.
     * @param {string} name Name of action to run.
     * @param {*} value The value to be mutated.
     * @param {*} args Arguments passed to the callback function.
     * @returns {*}
     */
    applyFilters(name, value, ...args) {
        this.getHooks('filters', name).forEach(hook => {
            value = hook.callback(this, value, ...args);
        });
        return value;
    }

    /**
     * Extract the Youtube ID from a URL. Returns full value if no matches.
     * @param {string} url
     * @returns {string}
     */
    urlToId(url) {
        const regex = /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|(?:(?:youtube-nocookie\.com\/|youtube\.com\/)(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed|v|vi|user)\/)))([a-zA-Z0-9\-_]*)/;
        const matches = url.match(regex);
        return Array.isArray(matches) && matches[1] ? matches[1] : url;
    }

    /**
     * Get list of elements found with the selector.
     * @param {NodeList|HTMLCollection|string} selector
     * @returns {array}
     */
    getElements(selector) {
        var elements = null;

        if (selector) {
            if (NodeList.prototype.isPrototypeOf(selector) || HTMLCollection.prototype.isPrototypeOf(selector)) {
                elements = selector;
            } else if (typeof selector === 'object' && 'nodeType' in selector && selector.nodeType) {
                elements = [selector];
            } else {
                elements = document.querySelectorAll(this.getOption('selector'));
            }
        }

        elements = Array.from(elements || '');

        return this.applyFilters('elements', elements);
    }

    /**
     * Build API url from video id.
     * @param {string} videoId
     * @returns {string}
     */
    requestUrl(videoId) {
        const endpoint = this.getOption('endpoint');
        const url = endpoint + videoId;
        return this.applyFilters('request.url', url, endpoint, videoId);
    }

    /**
     * Sort formats by a list of functions.
     *
     * @param {object} a
     * @param {object} b
     * @param {function[]} processors
     * @returns {number}
     */
    bulkSortBy(a, b, processors) {
        let result = 0;

        for (let fn of processors) {
            const diff = fn(b) - fn(a);
            result += diff;
        }

        return result;
    }

    /**
     * Get stream data from API response.
     * @param {object} response
     * @returns {array}
     */
    getStreamData(response) {
        const data = response?.data || {};

        let streams = [];

        // Build streams array
        Array.from(data.formats || '').forEach(stream => {
            let thisData = {
                _raw: stream,
                itag: stream.itag,
                url: stream.url,
                format: stream.qualityLabel,
                type: 'unknown',
                mime: 'unknown',
                hasAudio: stream.hasAudio,
                hasVideo: stream.hasVideo,
                browserSupport: 'unknown'
            };

            if (!thisData.format) {
                // Add audio format fallback
                if (thisData.hasAudio && !thisData.hasVideo) {
                    thisData.format = `${stream.audioBitrate}kbps`;
                }
            }

            // Extract stream data from mimetype.
            if ('mimeType' in stream) {

                const mimeParts = stream.mimeType.match(/^(audio|video)(?:\/([^;]+);)?/i);

                // Set media type (video, audo)
                if (mimeParts[1]) {
                    thisData.type = mimeParts[ 1 ];
                }

                // Set media mime (mp4, ogg...etc)
                if (mimeParts[2]) {
                    thisData.mime = mimeParts[2];
                }

                // Set browser support rating
                thisData.browserSupport = this.canPlayType(`${thisData.type}/${thisData.mime}`);
            }

            streams.push(thisData);
        });

        // Sort streams by playability and quality
        streams.sort((a, b) => {
            return this.bulkSortBy(a, b, [
                format => {
                    return {
                        'unknown': -1,
                        'no': -1,
                        'maybe': 0,
                        'probably': 1
                    }[format.browserSupport];
                },
                format => +!!format._raw.isHLS,
                format => +!!format._raw.isDashMPD,
                format => +(format._raw.contentLength > 0),
                format => +(format.hasVideo && format.hasAudio),
                format => +format.hasVideo,
                format => parseInt(format.format) || 0,
                format => format._raw.bitrate || 0,
                format => format._raw.audioBitrate || 0,
                format => [
                    'mp4v',
                    'avc1',
                    'Sorenson H.283',
                    'MPEG-4 Visual',
                    'VP8',
                    'VP9',
                    'H.264',
                ].findIndex(encoding => format._raw.codecs && format._raw.codecs.includes(encoding)),
                format => [
                    'mp4a',
                    'mp3',
                    'vorbis',
                    'aac',
                    'opus',
                    'flac',
                ].findIndex(encoding => format._raw.codecs && format._raw.codecs.includes(encoding))
            ]);
        });

        // Only return streams with audio
        if (this.getOption('withAudio')) {
            streams = streams.filter(item => item.hasAudio);
        }

        // Only return streams with video
        if (this.getOption('withVideo')) {
            streams = streams.filter(item => item.hasVideo);
        }

        const allowedFormats = this.getOption('formats');

        // Filter streams further by allowed formats.
        if (allowedFormats !== '*') {
            streams = streams.filter(item => Array.from(allowedFormats).includes(item.format));
        }

        return streams;
    }

    /**
     * Check if a given mime type can be played by the browser.
     * @link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canPlayType
     * @param {string} type For example "video/mp4"
     * @returns {CanPlayTypeResult|string} probably, maybe, no, unkown
     */
    canPlayType(type) {

        var phantomEl;

        if (/^audio/i.test(type)) {
            phantomEl = document.createElement('audio');
        } else {
            phantomEl = document.createElement('video');
        }

        const value = phantomEl && typeof phantomEl.canPlayType === 'function' ? phantomEl.canPlayType(type) : 'unknown';

        return value ? value : 'no';
    }

    /**
     * Run our full process. Loops through each element matching the selector.
     */
    load() {
        const elements = this.getElements(this.getOption('selector'));

        if (elements && elements.length) {
            elements.forEach(element => this.loadSingle(element) );
        }
    }

    /**
     * Process a single element.
     * @param {Element} element
     */
    loadSingle(element) {

        /**
         * Attribute name for grabbing YouTube identifier/url.
         *
         * @type {string}
         */
        const attribute = this.getOption('attribute');

        // Check if element has attribute value
        if (element.getAttribute(attribute)) {

            // Extract video id from attribute value.
            const videoId = this.urlToId(element.getAttribute(attribute));

            // Build request url.
            const requestUrl = this.requestUrl(videoId);

            this.doAction('load.before', element);

            fetch(requestUrl).then(response => {
                response.json().then(json => this.doAction('load.success', element, json));
            }).catch(response => {
                response.json().then(json => this.doAction('load.failed', element, json));
            }).finally(() => {
                this.doAction('load.after', element)
            });
        }
    }

    /**
     * Parse raw YouTube response into usable data.
     * @param {YouTubeToHtml5} context
     * @param {Element} element
     * @param {object} response
     */
    static _actionLoadSuccess(context, element, response) {

        let streams = context.getStreamData(response);

        // Limit to element tag name (video/audio)
        streams = streams.filter(item => item.type === element.tagName.toLowerCase());

        // Get the top priority stream
        const stream = streams.shift();

        if (stream) {
            element.src = stream.url;
        }
    }

    static _actionLoadFailed(context, element, response) {
        console.warn(`${context.class} was unable to load video.`);
    }

}

export default YouTubeToHtml5;
