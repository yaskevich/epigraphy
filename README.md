# Epigraphy
## Russian Corpus of Inscriptions (Epigraphic Database)

### Project components

1. Frontend (JQuery, SASS)
2. Backend (NodeJS, SQLite)
3. [Autoupdate](/scripts) (NodeJS, SQLite)
4. [MS Word exporter](/word) (Perl, MS Office/OLE)
5. [Static files](https://github.com/yaskevich/epidata/)

Docker file currently builds the frontend and backend, filling the database with up-to-date records from Google Spreadsheet. Static files (including MS Word extracts) have to be imported from the repository.

The same build could be compiled manually, according to the instruction below.

### Basic setup

Frontend web-server is a regular [Express.js](https://expressjs.com) application. The [scripts](/scripts/) that fill the database share dependencies with the frontend, but have independent codebase.

#### Preparations

[NodeJS](https://nodejs.org/) must be installed on a server.

NB: the application and data processing scripts were tested on **Ubuntu 18.04** with **NodeJS v13.14.0**.

Execute `npm install` in a project folder.

#### Data importing

1. Put ID of Google Spreadsheet document that is a data source into *docID* property of config file.
2. Generate Google Token (JWT) for web-service, *keyFile* property in config (path to file).
3. Share the spreadsheet with the user who owns the token.
4. Run the scripts:

- `node scripts/download-sheets.js`: gets data from Google Spreadsheets  API. JWT token must be provided.
- `node scripts/import-sheets.js`: takes JSON of a spreadsheet and converts it into SQLite database. Mapping tables for field names and their respective SQL column codes have to be provided – as CSV files. Currently used mappings are in [scripts](/scripts/) directory of this repository.
- `node scripts/process-descriptions.js`: content of `data` folder is imported as an additional table containing detailed descriptions of objects related by their CIR codes. Currently data are [here](https://github.com/yaskevich/epidata/).

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

As well one should restart NodeJS process, the command depends on environment (`pm2` or other), because the data are <u>cached</u> on process  start.

#### Production

There is [config](ecosystem.config.js) for [PM2](https://pm2.keymetrics.io) (NodeJS process manager). It is not recommended to run NodeJS application in production environment neither via `node` directly nor with `nodemon`.

#### Dockerize

Run `run-docker.sh` to start the app in Docker container available on local port **3333**.

### Future

In `docker-update` folder dockerfile and script are provided which allow to build Docker image avoiding manual cloning this repository. But to work properly this Docker configuration requires Github Deploy keys, Google Web Token and authentication login/password pair  (as [env](https://www.npmjs.com/package/dotenv) file or as shell environment variables).

Credentials **are not stored** in git for security reasons. One has to provide them (place into the directory where Docker scripts are to be executed).

[Seprate repository](https://github.com/yaskevich/epidata/) for static files is a temporary stub, as soon as those files are also could be updated. WebDAV/FTP or similar infrastructure should be provided to users and appropriate directories are to be mapped into directory space accessible by frontend web-server.



:space_invader: