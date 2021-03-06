
Package.describe({
  name: 'keplerjs:categories',
  summary: 'keplerjs places and users categorization',
  version: "1.3.0",
  git: "https://github.com/Keplerjs/Kepler.git"
});

Package.onUse(function(api) {

  api.versionsFrom("1.5.1");

  var packages = [
    'keplerjs:core',
  ];

  api.use(packages);
  api.imply(packages);

  api.addFiles([
    'plugin.js',
    'i18n/it.js',
    'i18n/en.js',
    'i18n/de.js',
    'i18n/es.js',
    'i18n/fr.js',
    'modules/Cats.js'
  ]);

  api.addFiles([
    'client/views/panels/place.html',
    'client/views/panels/place.js',
    'client/views/panels/user.html',
    'client/views/panels/user.js',
    'client/views/panels/settings.html',
    'client/views/panels/settings.js'
  ],'client');

});
