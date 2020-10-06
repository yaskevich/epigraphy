# Epigraphy
## Russian Corpus of Inscriptions (Epigraphic Database)

This is a regular [Express.js](https://expressjs.com) application.

#### Preparations

[NodeJS](https://nodejs.org/) must be installed on a server.

NB: the application and data processing scripts were tested on **Ubuntu 18.04** with **NodeJS v13.14.0**.

Execute `npm install` in a project folder.

#### Data importing

1. Put ID of Google Spreadsheet document that is a data source into *docID* property of config file.
2. Generate Google Token (JWT) for web-service, *keyFile* property in config (path to file).
3. Share the spreadsheet with the user who owns the token.
4. Run the scripts:

- `node download-sheets.js`: gets data from Google Spreadsheets  API. JWT token must be provided.
- `node import-sheets.js`: takes JSON of a spreadsheet and converts it into SQLite database. Mapping tables for field names and their respective SQL column codes have to be provided (as CSV files).
- `process-descriptions.js`: content of `data` folder is imported as an additional table containing detailed descriptions of objects related by their CIR codes.

#### Running the application

* `npm run css-build` (optional)

* `npm run start` or `nodemon index.js` 

The front-end does not have any external dependencies and can run in a local network or on a local computer.

By default, the web-server works on a port **7528**.

#### Setting up a frontend proxy

Proxy-pass directive must be set on a front-end web-server, like this for **Nginx**:

> proxy_pass http://127.0.0.1:7528;

#### Updating the database

To fetch actual data from Google Spreadsheets, one has to add cronjob like this (5 AM for Moscow timezone on a UTC server):

```bash
0 2 * * * npm run sync --prefix /<...path..to.the...app...directory...>/  > /dev/null 2>&1
```

As well one should restart NodeJS process, the command depends on environment (`pm2` or other), because the data are pre-cached on process  start.

#### Dockerize

Run `build-docker.sh` and `run-docker.sh` to start the app in Docker container available on local port **3333**.



:space_invader: