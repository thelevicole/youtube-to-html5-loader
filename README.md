# Load YoutTube videos as HTML5 emebed element

[![Latest Stable Version](https://img.shields.io/npm/v/@thelevicole/youtube-to-html5-loader)](https://www.npmjs.com/package/@thelevicole/youtube-to-html5-loader)
[![Total Downloads](https://img.shields.io/npm/dt/@thelevicole/youtube-to-html5-loader)](https://www.npmjs.com/package/@thelevicole/youtube-to-html5-loader)
  
## Basic usage example  
Replacing `YOUTUBE_URL_OR_ID_GOES_HERE` with your video URL or ID.

```html
<video data-yt2html5="YOUTUBE_URL_OR_ID_GOES_HERE"></video>
<script src="YouTubeToHtml5.js"></script>
<script>new YouTubeToHtml5();</script>
```

### NPM

```
npm i @thelevicole/youtube-to-html5-loader
```

```javascript
const YouTubeToHtml5 = require('@thelevicole/youtube-to-html5-loader');
new YouTubeToHtml5();
```

### jsDelivr CDN

```html
<script src="https://cdn.jsdelivr.net/npm/@thelevicole/youtube-to-html5-loader@3.1.1/dist/YouTubeToHtml5.min.js"></script>
```

## Options example

```html
<video class="youtube-video" data-yt="https://youtube.com/watch?v=ScMzIvxBSi4"></video>
    
<script src="YouTubeToHtml5.js"></script>
<script>
  new YouTubeToHtml5({   
    selector: '.youtube-video',
    attribute: 'data-yt'
  });
</script>
```

## Internal API example

```html
<video data-yt2html5="YOUTUBE_URL_OR_ID_GOES_HERE"></video>
    
<script src="YouTubeToHtml5.js"></script>
<script>   
  var player = new YouTubeToHtml5({
    autoload: false // Disable loading videos on init, `.load()` method is required.
  });

  // Add loading class to video element
  player.addAction('api.before', function(element) {   
    element.classList.add('is-loading');
  });

  // Remove loading class after API HTTP request completes.
  player.addAction('api.after', function(element) {
    element.classList.remove('is-loading');
  });

  // Now we can load videos.
  player.load();
</script>
```

## Accepted URL patterns  
Below is a list of varying YouTube url patterns, which include http/s and www/non-www.  

```
youtube.com/watch?v=ScMzIvxBSi4
youtube.com/watch?vi=ScMzIvxBSi4
youtube.com/v/ScMzIvxBSi4
youtube.com/vi/ScMzIvxBSi4
youtube.com/?v=ScMzIvxBSi4
youtube.com/?vi=ScMzIvxBSi4
youtu.be/ScMzIvxBSi4
youtube.com/embed/ScMzIvxBSi4
youtube.com/v/ScMzIvxBSi4
youtube.com/watch?v=ScMzIvxBSi4&wtv=wtv
youtube.com/watch?dev=inprogress&v=ScMzIvxBSi4&feature=related
m.youtube.com/watch?v=ScMzIvxBSi4
youtube-nocookie.com/embed/ScMzIvxBSi4
```
