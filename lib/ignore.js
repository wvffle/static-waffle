module.exports = {
  compactIgnoredFiles: [
    'src/components/**',
    '!src/components/navigation/**',

    'src/layouts/**',
    'src/values/mixins.pug',

    'src/views/*/assets/js/app.js',
    'src/views/*/assets/js/router.js',
    'src/views/*/assets/js/waffle.js',

    'src/views/*/assets/css/grid.styl',
    'src/views/*/assets/css/boxModel.styl',
    'src/views/*/assets/css/typography.styl',
  ],
  ignoredFiles: [
    'src/components/component/**',
  ],
}
