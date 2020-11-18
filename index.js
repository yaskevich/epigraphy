"use strict";

const fs = require('fs');
const path = require('path');
const config = require('config');
require('dotenv').config();
// user/password for authentication, should be moved into DB later
const dbdata = require('./db');
const cache = require('persistent-cache')();
const express = require('express');
const session = require('cookie-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const whoiser = require('whoiser');
// const pino = require('pino');
// const satelize = require('satelize-lts');
// https://github.com/LionC/persistent-cache#readme
const Bowser = require("bowser");
var pinoms = require('pino-multi-stream');
const prettyStream = pinoms.prettyStream({ prettyPrint: { colorize: true, translateTime: "SYS:dd.mm.yyyy HH:MM:ss", ignore: "hostname,pid" }}); // add 'time' to remove timestamp
var streams = [{stream: fs.createWriteStream('app.log', {flags:'a'}) }, {stream: prettyStream }];
var logger = pinoms(pinoms.multistream(streams));
const app = express();
const cfg = config.get('app');
const port = cfg.server.port||7528;

// caching data from the database on start
cache.putSync('all', dbdata.dataJSON);
logger.info("[fetch SQL]");
app.use(require('body-parser').urlencoded({ extended: true }));
app.set('trust proxy', true);
// access to static resources for the frontend
app.use("/mustache.js", express.static(path.join(__dirname, 'node_modules', 'mustache', 'mustache.min.js')));
app.use("/jquery.js", express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist', 'jquery.min.js')));
app.use("/lazyload.js", express.static(path.join(__dirname, 'node_modules', 'vanilla-lazyload', 'dist', 'lazyload.min.js')));
app.use("/popper.js", express.static(path.join(__dirname, 'node_modules', '@popperjs', 'core', 'dist', 'umd', 'popper.min.js')));
app.use(express.static('node_modules/bulma-extensions/dist'));
app.use(express.static('node_modules/devbridge-autocomplete/dist'));
app.use(express.static('node_modules/nouislider/distribute'));
app.use(express.static('node_modules/tippy.js/dist'));
app.use(express.static('node_modules/@fortawesome/fontawesome-free/webfonts'));
app.use(express.static('fonts'));
app.use(express.static('pictures'));


// caching static pages that are served or served after being modified
// const root = path.join(__dirname, 'public', 'index.html');
const loginForm = path.join(__dirname, 'public', 'login.html');
const singlePath = path.join(__dirname, 'public', 'single-index.html');
const singlePathContent = fs.readFileSync(singlePath, 'utf-8');

// simple authentication
passport.use(new LocalStrategy(
  function(id, password, done) {
    let user = {"id": id};
    if (!(id === process.env.USER_ID && password === process.env.USER_PASSWORD)) {
        logger.warn("logging in attempt as user " + id + " [" + password + "]");
        done(null,false);
    } 
    logger.info("user ‹" + id + "› authenticated");
    return done(null, user);        
  }
));

passport.serializeUser(function(user, cb) {
    cb(null, user.id);
});

passport.deserializeUser(async function(id, cb) {
  let user = {"id": id};
  cb(null, user);
});

// session
app.use(session({
  secret: cfg.server.secret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));
app.use(passport.initialize());
app.use(passport.session());

// IP logging middleware
app.use( async(req, res, next) => {
    // const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!req.isAuthenticated() && !['/login', '/bulma.custom.css', '/omega-150x150.png'].includes(req.url)) {
        res.redirect('/login');
    } else {
        if (req.url === "/data.js" || req.url === "/"){
            
            // logging IP and related info of a user
            let datum = cache.getSync(req.ip);
            if (!datum) {
                let ipInfo = await whoiser(req.ip);
                datum = Reflect.getOwnPropertyDescriptor(ipInfo, "descr") && ipInfo.descr ? ipInfo.descr + ", " + ipInfo.country: "UNK";
                cache.putSync(req.ip, datum);
                datum += ' [get]';
            } 
            // Moscow Local Telephone Network (OAO MGTS)
            // Moscow, Russia, RU
            
            datum = datum.replace("Moscow Local Telephone Network (OAO MGTS)", "MGTS").replace("\n", " ");
            const ua = Bowser.parse(req.get('user-agent'));
            logger.info(`${req.ip} ${datum} • ${ua.browser.name} ${ua.browser.version} @ ${ua.os.name} ${ua.os.versionName}`);
            
            // satelize.satelize({ip:req.ip}, function(err, payload) {
              // // if used with expressjs
              // // res.send(payload);
              // // res.json...
              // // pr.logger.info("catch *", req.originalUrl, req.query);
              // // pr.logger.info(`${req.ip} ${payload.country.en} ${req.headers.host}${req.originalUrl}`)
              // console.log(`${req.ip} ${payload.country.en} ${req.headers.host}${req.originalUrl}`)
            // });
        }
        next();
    }
});
// static folder must be attached after authentication middleware to make access limit work
app.use(express.static('public'));
// authentication processing - start
app.get('/logout', (req, res) => {
    logger.info("logging out");
    req.logout();
    res.redirect('/login');
  });

app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login'}));

app.get("/login", (req, res) => {
    res.sendFile(loginForm);
});
// authentication processing - end

// page of objects which have descriptions
app.get("/:cir(cir[0-9]+)", (req, res) => {
    const row  = dbdata.getDocsData(req.params.cir.toUpperCase());
    if (row && Reflect.getOwnPropertyDescriptor(row, "cir")) {
        row["ogs"] = row.og.split(/\s*,\s*/);
    }
    const page = singlePathContent.replace('■', '<script> var datum = '+JSON.stringify(row)+';</script>');
    res.send(page);
});

// app.get("/cir", (req, res) => {    
    // res.sendFile(root);
// });

// app.get("/data", async(req, res) =>  {
    // let data = cache.getSync("all");
    // res.send(data);
// });

// data for client-side JavaScript code
app.get("/data.js", async(req, res) =>  {
    let data = cache.getSync("all");
    res.setHeader('content-type', 'text/javascript');
    res.writeHead(200);
    res.end('var data = '+ data);
});

app.listen(port);