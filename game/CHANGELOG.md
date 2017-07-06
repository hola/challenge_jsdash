# Changelog

## 2017-07-06

* Fixed --unsafe option being ignored
* Fixed a bug where the generator would sometimes see old screen states

## 2017-07-05

* Fixed a bug where frames were not dropped when they should be, and some input ended up getting ignored

## 2017-07-04

* Added --in-process for easier debugging; credits deNULL
* Fixed a bug where a butterfly killed by an explosion from another butterfly would be counted twice

## 2017-07-03

* Added Node.js version check to avoid accidental use with an old version (can be overridden with --force)
* Fixed logging of longest streak
