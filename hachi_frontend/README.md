# About:
This directory contains client-side logic for `hachi` .

## Development:
0. Icons are taken from [font-awesome](https://fontawesome.com/), and can be downloaded from their website. This project uses https://use.fontawesome.com/releases/v6.4.2/fontawesome-free-6.4.2-web.zip, after downloading unzippped folder is then put into ``./src/assets`` path, to allow using font-awesome resources locally. Build system would then include only necessary fonts/resources into the ``../static/assets`` directory. (which are then served as static files by Caddy server)

1. ``npm install``   command would install necessary npm dependencies.
2. Once frontend code is updated/modified, ``npm run build`` command would generate ``static`` (html/js/css)  files for the front-end into the ``../static/`` folder.
