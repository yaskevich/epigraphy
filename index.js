"use strict";

const fs = require('fs');
const path = require('path');
const cache = require('persistent-cache')();
const Database = require('better-sqlite3');
const express = require('express');
const asyncRoute = require('route-async');
const whoiser = require('whoiser');
const pino = require('pino')
const satelize = require('satelize-lts');
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

var streams = [
    {stream: fs.createWriteStream('app.log') },
    {stream: prettyStream }
];

var logger = pinoms(pinoms.multistream(streams))

const app = express();
// const cfg = pr.init();
const port = 7528; // cfg.front.port;
const dbFile = "cir.db";
const dataFile = "corpus.json";

// logger.info("ok");


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
	
const records = db.prepare('SELECT corpus.*, region, county FROM corpus left join places on corpus.ogl = places.ogl;').all();
const corpus_features = db.prepare('SELECT * from corpus_features ORDER BY v ASC').all();
const places_features = db.prepare('SELECT * from places_features ORDER BY v ASC').all();
const places = db.prepare('SELECT * from places').all();

const fi = fs.statSync(dataFile);
// console.log(fi);
var d = new Date(0);
// d.setUTCSeconds(fi.birthtimeMs/1000);
d.setUTCSeconds(fi.ctimeMs/1000);
// atimeMs: 1587866445003.176,
// mtimeMs: 1587866444219.1943,
// ctimeMs: 1587866444219.1943,
var time = d.toLocaleString('ru-RU', { "timeZone": "Europe/Moscow", "hour12": false, "month": 'long', "day": 'numeric', "hour": "numeric", "minute": "numeric" } );
// console.log(time);
const data = {
	"records": records, 
	"places": places, 
	"features": corpus_features,
	// "fea": groupByField(corpus_features),
	// "fea": corpus_features.reduce(function(obj,item){ obj[item.id] = item; return obj; }, {}),
	
	"places_features": places_features,
	// "places_features_sorted": places_features,
	"places_features_sorted": places_features.reduce(function(obj,item){ obj[item.id] = item; return obj; }, {}),
	"update": time
};

const data_json = JSON.stringify(data);
cache.putSync('all', data_json);
logger.info("[fetch SQL]");
    // else {
        // logger.info("send cached data");
    // }	
	
// }
  
// const pr = require('./processing');
app.set('trust proxy', true);
app.use(express.static('node_modules/bulma/css'));
app.use(express.static('node_modules/bulma-extensions/dist'));
app.use(express.static('node_modules/devbridge-autocomplete/dist'));
app.use(express.static('public'));
// cfg.front.mods.forEach(x => app.use(express.static(__dirname + x)));




app.use( async(req, res, next) => {
	// req.headers["test"] = req.headers.host === "test.gardariki.by" ? 1:0;
	const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	// pr.logger.info(req.ip);
	// logger.info(req.ip);
    
    let data = cache.getSync(req.ip);
    if (!data) {
        let ipInfo = await whoiser(req.ip);
        data = ipInfo.hasOwnProperty("descr")?ipInfo.descr+", "+ipInfo.country: "UNK";
        cache.putSync(req.ip, data);
        data += ' [get]'
    } 
	// Moscow Local Telephone Network (OAO MGTS)
	// Moscow, Russia, RU
	
	data = data.replace("Moscow Local Telephone Network (OAO MGTS)", "MGTS").replace("\n", "");
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
	return next();
});


app.get("/", (req, res) => {
	// console.log("landing be");
	const root = path.join(__dirname, 'public', 'index.html');
    res.sendFile(root);
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


// app.get("/map", (req, res) =>  {
    // res.sendFile(cfg.paths.map);
// });


app.get("/list", async(req, res) =>  {
	// const row = db.prepare('SELECT * FROM corpus WHERE id=?').get(userId);
	// const row = db.prepare('SELECT * FROM corpus LIMIT 100').all();
	const row = db.prepare('SELECT * FROM corpus').all();
	res.json(row);
	// res.json( await pr.generateListOfCities (isTestHost(req)) );
	// res.sendFile( await pr.generateListOfCities (isTestHost(req)) );
});

app.get("/features", async(req, res) =>  {
	// const row = db.prepare('SELECT * FROM corpus WHERE id=?').get(userId);
	// const row = db.prepare('SELECT * FROM corpus LIMIT 100').all();
	
	const corpus_features = db.prepare('SELECT * from features').all();
	res.json(corpus_features);
	// res.json( await pr.generateListOfCities (isTestHost(req)) );
	// res.sendFile( await pr.generateListOfCities (isTestHost(req)) );
});


app.get("/filters", async(req, res) =>  {
	// const row = db.prepare('SELECT * FROM corpus WHERE id=?').get(userId);
	// const row = db.prepare('SELECT * FROM corpus LIMIT 100').all();
	const allCols = {"cir":"СIR","og":"OG","xx":"Век","yr":"Год","pub":"Публикация","pubform":"Форма прошлых публикаций","name":"Наименование надписи","transcript":"Практическая транскрипция","place":"Местонахождение","ogl":"Шифр места","dim":"Размеры носителя","objtype":"Тип памятника","genre":"Содержание надписи","mat":"Материал носителя","method":"Способ изготовления","carv":"Резьба","carvcut":"Техника врезной резьбы","carvrel":"Техника рельефной резьбы","let":"Тип письма","letvar":"Вариация типа письма","lang":"Язык","orn":"Орнамент","pict":"Изображения","paint":"Краска","inscond":"Сохранность надписи","objcond":"Сохранность носителя","orig":"Подлинность","template":"Шаблон","doc":"Документирование","operators":"Операторы","authors":"Авторы"};
	
	const row1 = db.prepare('SELECT DISTINCT pubform from corpus').all();
	const row2 = db.prepare('SELECT DISTINCT lang from corpus').all();
	res.json({pubform: row1.map(x => x["pubform"])});
	// res.json( await pr.generateListOfCities (isTestHost(req)) );
	// res.sendFile( await pr.generateListOfCities (isTestHost(req)) );
});


// app.all("/api", async(req, res) =>  {
	// console.log(req.headers.host, req.query);
	// let id = parseInt(req.query.id);
	// if (id) {
		// const lng = req.query.l == cfg.front.languages[0] ? cfg.front.languages[0]: cfg.front.languages[1];
		// let rs = (id == 6) ? "Казімірава Слабада зараз частка Мсціслава" : 
			// await pr.generateCityModal(lng, id, isTestHost(req));
		// res.send(rs);
	// } else {
		// res.status(404).send("ID error");
	// }
// });

// app.all("*", (req, res) => {
  // pr.logger.warn("catch * -> redir");
  // // res.send("Hi, stranger!");
  // res.redirect("/");
// });

app.listen(port, () => {
  // logger.info("Listening on port " + port);
});

