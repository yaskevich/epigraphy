# Epigraphy
## Russian Corpus of Inscriptions (Epigraphic Database)

This is a regular Express.js application.

NodeJS must be installed on a server. Tested on *Ubuntu 18.04* with *NodeJS v13.14.0*.

* `npm install`

* `npm run css-build`

* `npm run start` or `nodemon index.js` 

The front-end does not have any external dependencies and can run in a local network or on a local computer.

To fetch actual data from Google Spreadsheets, one has to add cronjob like this (5 AM):

```bash
0 2 * * * sh ................/sync.sh > /dev/null 2>&1
```

The web-server works on a port **7528**.

Proxy-pass directive must be set on a front-end web-server, like this for *Nginx*:

> proxy_pass http://127.0.0.1:7528;

:space_invader: