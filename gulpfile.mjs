import gulp from 'gulp';
import babel from 'gulp-babel';
import minify from 'gulp-babel-minify';

function buildTask(callback) {

    // Process javascripts
    gulp.src('src/YouTubeToHtml5.js')
        .pipe(babel({
            presets: ['@babel/env']
        })).on('error', function(error) {
            console.error(error.toString(), '\n\b', error.codeFrame);
            this.emit('end');
        })
        .pipe(minify())
        .pipe(gulp.dest('dist'));

    callback();
}

export default buildTask;
