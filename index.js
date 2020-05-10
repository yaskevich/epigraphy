"use strict";

const fs = require('fs');
const path = require('path');
const cache = require('persistent-cache')();
const Database = require('better-sqlite3');
const express = require('express');
const asyncRoute = require('route-async');
const whoiser = require('whoiser');
// const pino = require('pino');
// const satelize = require('satelize-lts');
// https://github.com/LionC/persistent-cache#readme
const Bowser = require("bowser");
var pinoms = require('pino-multi-stream');
const prettyStream = pinoms.prettyStream({ 
 prettyPrint: 
  { colorize: true,
    translateTime: "SYS:dd.mm.yyyy HH:MM:ss",
    // translateTime: "SYS:standard",
    ignore: "hostname,pid" // add 'time' to remove timestamp
  }
});
var streams = [ {stream: fs.createWriteStream('app.log', {flags:'a'}) }, {stream: prettyStream } ];
var logger = pinoms(pinoms.multistream(streams));
const app = express();
// const cfg = pr.init();
const port = 7528; // cfg.front.port;
const dbFile = "cir.db";
const dataFile = "corpus.json";
const translations = {
    "empty": "(пусто)"
};
// let db = new Database(dbFile, { verbose: console.log });
let db = new Database(dbFile);

const groupBy = key => array =>
  array.reduce((objectsByKeyValue, obj) => {
    const value = obj[key];
    objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
    return objectsByKeyValue;
 }, {});
 
const groupByField = groupBy('id');

// const feats = db.prepare('SELECT * from features').all();

// var result = feats.reduce(function(obj,item){
  // obj[item.id] = item; 
  // return obj;
// }, {});

// console.log(result);
  
  
// if (cache.getSync("all")){
    // cache.deleteSync("all");
    
    // logger.info("clear cache")

const records = db.prepare('SELECT corpus.*, region, county, docs.filename as fn FROM corpus left join places on corpus.ogl = places.ogl left join docs on corpus.cir = docs.cir ORDER BY yr ASC NULLS LAST;').all();    
const corpus_features = db.prepare('SELECT * from corpus_features ORDER BY v ASC').all();
const places_features = db.prepare('SELECT * from places_features ORDER BY v ASC').all();
const places = db.prepare('SELECT * from places').all();
const corpus_fields = db.prepare('SELECT * from corpus_fields').all();
const places_fields = db.prepare('SELECT * from places_fields').all();
// const records_full = [];
let yearsRange = [];
for (let i in records){
    const rec = records[i];
    const year = rec.yr ? rec.yr.substring(0, 4) : 2000;
    rec["ymin"] = year;
    
    if (rec.og && rec.og.match(/[og\d\,\s]+/i)){
        rec["ogs"] = rec.og.split(/\s*\,\s*/);
        // if (rec.og.length>1){
            // console.log(rec.og);
        // }
        // console.log(rec["og1"]);
    }
    // else {
        // console.log(rec.og);
    // }
    
    if (yearsRange.indexOf(year) === -1) {
        yearsRange.push(year);
    }
}
// console.log(records[0]);
// console.log(corpus_features);
yearsRange = yearsRange.sort();
// for (let y in yearsRange){
// console.log(yearsRange[y]);
// }
const fi = fs.statSync(dataFile);
// console.log(fi);
let d = new Date(0);
// d.setUTCSeconds(fi.birthtimeMs/1000);
d.setUTCSeconds(fi.ctimeMs/1000);
// atimeMs: 1587866445003.176,
// mtimeMs: 1587866444219.1943,
// ctimeMs: 1587866444219.1943,
const time = d.toLocaleString('ru-RU', { "timeZone": "Europe/Moscow", "hour12": false, "month": 'long', "day": 'numeric', "hour": "numeric", "minute": "numeric" } );
// console.log(time);
let filters = {};

for (let i in corpus_features){
    const val = corpus_features[i];
    if (val.f === "xx" && val.v){
        val.v = val.v.replace("15", "XV").replace("16", "XVI").replace("17", "XVII").replace("18", "XVIII");
    }
    filters.hasOwnProperty(val["f"]) ? filters[val["f"]].push(val) : filters[val["f"]] = [val];
}
for (let key in filters){
    // console.log(i);
    filters[key].push(filters[key].shift());
}
    
// console.log(filters);
const regions = [];
const counties = [];
for (var p in places_features) {
    if (places_features.hasOwnProperty(p)) {
        var v = places_features[p];
        if (v['f'] === "region") {
            regions.push(v);
        } else if (v['f'] === "county") {
            counties.push(v);
        }
    }
}

regions.push(regions.shift());
counties.push(counties.shift());
filters.region = regions;
filters.county = counties;

const arrToProps = (arr) => arr.reduce(function(map, obj) { map[obj.name_code] = obj.name_out; return map; }, {});
const fields = Object.assign({}, arrToProps(corpus_fields), arrToProps(places_fields));
// console.log(regions);
// console.log(filters);
// console.log(places);
// console.log(corpus_features);
// for (let p in places){
    // console.log(places[p].ogl);
// }

////////////////////////////////////////////////////////////////////////
// In development phase, any data structure required by UI was generated on a backend to speed up prototyping
// Afterwards, redundant data HAVE TO BE eliminated to minimize backend load and bloating of page memory
////////////////////////////////////////////////////////////////////////
// const places_object = Object.assign({}, ...places_features.map(x => ({ [x.id]: x })));

// const places2 = places;
// for (let i in places2){
    // let obj = places2[i];
    // console.log(obj);
    
    // for (let p in obj){
        // if (p!=='id'){
            // let x = obj[p];
            // let res = x;
            // let vals = [x];
            // let full = '';
            // if (places_object.hasOwnProperty(x)){
                // full = places_object[x]['v'];                
                // vals.unshift(full||translations["empty"]);
            // }
            // obj[p] = vals;
            // console.log(`${p} ● ${res} ■ ${full}`);
        // }
    // }
    // console.log(obj);
    // break;
// }
const data = {
    "meta": { 
        "update": time,
        "years": [parseInt(yearsRange[0])-1, +yearsRange[yearsRange.length-2]],
        "ogls": places.map(x => x.ogl),
        "ymins": yearsRange,
        "filters": [ "xx", "objtype", "genre", "mat", "method", "carv", "lang", "orn", "inscond", "carvcut", "let", "pict", "objcond", "carvrel", "letvar", "paint", "orig", "region", "county" ],
        "cols2": ["ogl", "name", "place", "region","district","county","suburb","monastery","country"]
    },
    // "records_object": Object.assign({}, ...corpus_features.map(x => ({ [x.id]: x }))),
    "fields": fields,
    "regions": regions,
    "counties": counties,   
    "records": records, 
    "corpus_filters": filters,
    "places": places, 
    "features": corpus_features,
    "places_features": places_features,
    // "places_object": places_object,
    "places_features_sorted": places_features.reduce(function(obj,item){ obj[item.id] = item; return obj; }, {})
};
// console.log(fields);
// console.log(filters);
// console.log(data.places_features_sorted);
const data_json = JSON.stringify(data);
cache.putSync('all', data_json);
logger.info("[fetch SQL]");
app.set('trust proxy', true);
app.use("/mustache.js", express.static(path.join(__dirname, 'node_modules', 'mustache', 'mustache.min.js')));
app.use("/jquery.js", express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist', 'jquery.min.js')));
app.use("/lazyload.js", express.static(path.join(__dirname, 'node_modules', 'vanilla-lazyload', 'dist', 'lazyload.min.js')));
app.use("/popper.js", express.static(path.join(__dirname, 'node_modules', '@popperjs', 'core', 'dist', 'umd', 'popper.min.js')));
app.use(express.static('node_modules/bulma-extensions/dist'));
app.use(express.static('node_modules/devbridge-autocomplete/dist'));
app.use(express.static('node_modules/tippy.js/dist'));
app.use(express.static('node_modules/@fortawesome/fontawesome-free/webfonts'));
app.use(express.static('public'));
// cfg.front.mods.forEach(x => app.use(express.static(__dirname + x)));

app.use( async(req, res, next) => {
    // const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (req.url === "/" || req.url === "/data.js"){
        let data = cache.getSync(req.ip);
        if (!data) {
            let ipInfo = await whoiser(req.ip);
            data = ipInfo.hasOwnProperty("descr")?ipInfo.descr+", "+ipInfo.country: "UNK";
            cache.putSync(req.ip, data);
            data += ' [get]';
        } 
        // Moscow Local Telephone Network (OAO MGTS)
        // Moscow, Russia, RU
        
        data = data.replace("Moscow Local Telephone Network (OAO MGTS)", "MGTS").replace("\n", " ");
        const ua = Bowser.parse(req.get('user-agent'));
        logger.info(`${req.ip} ${data} • ${ua.browser.name} ${ua.browser.version} @ ${ua.os.name} ${ua.os.versionName}`);
        
        // satelize.satelize({ip:req.ip}, function(err, payload) {
          // // if used with expressjs
          // // res.send(payload);
          // // res.json...
          // // pr.logger.info("catch *", req.originalUrl, req.query);
          // // pr.logger.info(`${req.ip} ${payload.country.en} ${req.headers.host}${req.originalUrl}`)
          // console.log(`${req.ip} ${payload.country.en} ${req.headers.host}${req.originalUrl}`)
        // });
    }
    return next();
});

app.get("/", (req, res) => {
    // console.log("landing be");
    const root = path.join(__dirname, 'public', 'index.html');
    res.sendFile(root);
});

app.get("/:cir(cir[0-9]+)", (req, res) => {
    // console.log("!!!", req.params, req.params.cir);
    // const root = path.join(__dirname, 'public', 'index.html');
	// db.prepare('SELECT DISTINCT pubform from corpus').all();
	const row = db.prepare('SELECT * FROM docs WHERE cir = ?').get(req.params.cir.toUpperCase());
	
	if (row && row.hasOwnProperty("cir")) {
		row["ogs"] = row.og.split(/\s*\,\s*/);
	}
	// console.log(row);
    // res.sendFile(root);
	// res.json(row.hasOwnProperty("cir")?row:{});
	const singlePath = path.join(__dirname, 'public', 'single-index.html');
	let single = fs.readFileSync(singlePath, 'utf-8');
	single = single.replace('■', '<script> var datum = '+JSON.stringify(row)+';</script>');
    // res.sendFile(single);
    res.send(single);
});

app.get("/cir", (req, res) => {
    // console.log("landing be");
    const root = path.join(__dirname, 'public', 'index.html');
    res.sendFile(root);
});

app.get("/data", async(req, res) =>  {
    let data = cache.getSync("all");
    res.send(data);
});

app.get("/data.js", async(req, res) =>  {
    let data = cache.getSync("all");
    res.setHeader('content-type', 'text/javascript');
    res.writeHead(200);
    res.end('var data = '+ data);
});

// app.all("*", (req, res) => {
  // pr.logger.warn("catch * -> redir");
  // // res.send("Hi, stranger!");
  // res.redirect("/");
// });

app.listen(port, () => {
  // logger.info("Listening on port " + port);
});