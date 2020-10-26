# Load YoutTube videos as HTML5 emebed element

## Basic usage example

```html
<video data-yt2html5="YOUTUBE_ID_GOES_HERE"></video>

<script src="YouTubeToHtml5.js"></script>
<script>new YouTubeToHtml5();</script>
```

## Options example
```html
<video class="youtube-video" data-id="YOUTUBE_ID_GOES_HERE"></video>

<script src="YouTubeToHtml5.js"></script>
<script>new YouTubeToHtml5( {
    selector: '.youtube-video',
    attribute: 'data-id'
} );</script>
```

## Internal API example
```html
<video data-yt2html5="YOUTUBE_ID_GOES_HERE"></video>

<script src="YouTubeToHtml5.js"></script>
<script>
    var player = new YouTubeToHtml5( {
        autoload: false
    } );

    player.addAction( 'api.before', function( element ) {
        element.classList.add( 'is-loading' );
    } );
    
    player.addAction( 'api.end', function( element ) {
        element.classList.remove( 'is-loading' );
    } );

    player.load();
</script>
```
