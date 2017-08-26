const gulp = require('gulp');
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const minify = require('gulp-minify');

gulp.task('build', function () {
  gulp.src('./bot/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(concat('solution.js'))
    .pipe(sourcemaps.write('.', {sourceRoot: './bot'})) 
    .pipe(gulp.dest('.'));
});

gulp.task('minify', function () {
  gulp.src('solution.js')
    .pipe(minify())
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['build'], function (gulpCallback) {
  gulp.watch(['./bot/**/*.js'], ['build']);
});