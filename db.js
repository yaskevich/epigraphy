'use strict';

/**
 * @file is the root file for the example.
 * It kicks things off.
 * @see <a href="module-Database.html">Database</a>
 */

/**
 * Module to getting data from the Database.
 * @module Database
 */
const fs = require('fs');
const path = require('path');
const config = require('config');
const cfg = config.get('app');
const Database = require('better-sqlite3');
const dbFile = path.join(__dirname, cfg.dbName);
// let db = new Database(dbFile, { verbose: console.log });
let db = new Database(dbFile);
const dataFile = path.join(__dirname, cfg.sourceFile);

/**
 * This function gets full dataset from the database and organizes it in a way that is handy for handling on a client.
 * @returns {string} dataset as an object serilaized into JSON.
 * @memberof module:Database
 */
function getDataset() {
    // database queries
    const records = db.prepare('SELECT corpus.*, region, county, docs.filename as fn FROM corpus left join places on corpus.ogl = places.ogl left join docs on corpus.cir = docs.cir ORDER BY yr ASC NULLS LAST;').all();    
    const corpus_features = db.prepare('SELECT * from corpus_features ORDER BY v ASC').all();
    const places_features = db.prepare('SELECT * from places_features ORDER BY v ASC').all();
    const places = db.prepare('SELECT * from places').all();
    const corpus_fields = db.prepare('SELECT * from corpus_fields').all();
    const places_fields = db.prepare('SELECT * from places_fields').all();
    
    // data restructuring
    let yearsRange = [];
    
    for (let i in records){
        const rec = records[i];
        const year = rec.yr ? rec.yr.substring(0, 4) : 0;
        rec["ymin"] = year;
        
        if (rec.og && rec.og.match(/[og\d,\s]+/i)){
            rec["ogs"] = rec.og.split(/\s*,\s*/);
        }
        
        if (yearsRange.indexOf(year) === -1) {
            yearsRange.push(year);
        }
    }
    
    yearsRange = yearsRange.sort();
    
    const fi = fs.statSync(dataFile);
    let d = new Date(0);
    d.setUTCSeconds(fi.ctimeMs/1000);
    // const time = d.toLocaleString('ru-RU', { "timeZone": "Europe/Moscow", "hour12": false, "month": 'long', "day": 'numeric', "hour": "numeric", "minute": "numeric" } );
    const time = d.toLocaleString('ru-RU', { "timeZone": "Europe/Moscow", "hour12": false, "month": 'long', "day": 'numeric' } );
    // console.log(time);
    let filters = {};

    for (let i in corpus_features){
        const val = corpus_features[i];
        if (val.f === "xx" && val.v){
            val.v = val.v.replace("15", "XV").replace("16", "XVI").replace("17", "XVII").replace("18", "XVIII");
        }
        Reflect.getOwnPropertyDescriptor(filters, val["f"]) ? filters[val["f"]].push(val) : filters[val["f"]] = [val];
    }
    
    for (let key in filters){
        filters[key].push(filters[key].shift());
    }
        
    const regions = [];
    const counties = [];
    for (var p in places_features) {
        if (Reflect.getOwnPropertyDescriptor(places_features, p)) {
            var v = places_features[p];
            if (v['f'] === "region") {
                regions.push(v);
            } else if (v['f'] === "county") {
                counties.push(v);
            }
        }
    }

    filters.region = regions;
    filters.county = counties;

    const places_features_sorted = places_features.reduce(function(obj,item){ obj[item.id] = item; return obj; }, {});

    // This helper function just makes object from an array, like { name_code : name_out }
    const arrToProps = arr => arr.reduce(function(map, obj) { map[obj.name_code] = obj.name_out; return map; }, {});
    const fields  = { ...arrToProps(corpus_fields), ...arrToProps(places_fields)};    

    // ////////////////////////////////////////////////////////////////////////////////////////////////////////// //
    // In development phase, any data structure required by UI was generated on a backend to speed up prototyping //
    // Afterwards, redundant data HAVE TO BE eliminated to minimize backend load and bloating of page memory      //
    // ////////////////////////////////////////////////////////////////////////////////////////////////////////// //
    
    const data = {
        "meta": { 
            "update": time,
            "years": [Number(yearsRange[1]), Number(yearsRange[yearsRange.length-1])],
            "ogls": places.map(x => x.ogl),
            "ymins": yearsRange,
            "filters": ["xx", "objtype", "genre", "mat", "method", "carv", "lang", "orn", "inscond", "carvcut", "let", "pict", "objcond", "carvrel", "letvar", "paint", "orig", "region", "county"],
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
        "places_features_sorted": places_features_sorted
    };	
    return JSON.stringify(data);        
}

/**
 * This function gets the data about description of single object from the database.
 * @param {string} cir is unqiue CIR code of the inscription.
 * @returns {object} data containing description of inscription.
 * @memberof module:Database
 */	
function getDocsData(cir) {
	// db.prepare('SELECT DISTINCT pubform from corpus').all();
	const row = db.prepare('SELECT * FROM docs WHERE cir = ?').get(cir);
	return row;
}	

module.exports = { getDataset, getDocsData};