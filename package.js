Package.describe({
  name: "lufrai:spiderable2",
  summary: "Docker + Port friendly Spiderable package",
  version: "0.9.0",
  git: "https://github.com/lufrai/spiderable2",
  documentation: 'README.md'
});

Npm.depends({
  'zombie': '3.1.1',
  'html-minifier': '0.7.2'
});

Package.on_use(function (api) {
  api.versionsFrom('1.0.2');
  api.use('webapp', 'server');
  api.use(['templating'], 'client');
  api.use(['underscore'], ['client', 'server']);

  api.export( 'Spiderable2' );

  api.add_files('spiderable.html', 'client');
  api.add_files('spiderable.js', ['client', 'server']);
  api.add_files('spiderable_server.js', 'server');
  api.add_files('spiderable_client.js', 'client');
});

Package.on_test(function (api) {
  api.use(['lufrai:spiderable2', 'tinytest']);
  api.add_files('spiderable_tests.js', 'server');
});
