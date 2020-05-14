'use strict';

const path = require("path");
const fs = require('fs');
const SQLite = require('better-sqlite3');
const config = require('config');
const csv = require('async-csv');

const appDir = path.join(__dirname, ".."); //__dirname
// code to extract headers
// const headers = [];
// const counter = {};
// fs.readdirSync(dataDir).forEach(file => {
  // const content = fs.readFileSync(path.join(__dirname, 'data', file), 'utf-8').split("\n");
  // const len = content.length;
  // for (let i = 0; i < len; i++) {
      // const line = content[i].trim().replace(/<[^>]+>/g, '');
      // // <b>[Датировка]</b>
      // const res = line.match(/^\[.*?\]$/);
      // if (res) {
          // if (counter.hasOwnProperty(line)){
              // counter[line]++;
          // } else {
              // counter[line] = 1;
          // }
        // // headers.push(line);
      // } else {
          // // headers.push(`|${line}|`);
      // }
  // }
// });
(async () => {
    const cfg = config.get('app');
    const db = new SQLite(path.join(appDir, cfg.dbName));
    const dbgFile = path.join(appDir, ...cfg.sources.descriptions.output);
    const dataDir = path.join(appDir, cfg.sources.descriptions.dir);
    const table = cfg.sources.descriptions.table;
    const csvString = fs.readFileSync(path.join(__dirname, ...cfg.sources.descriptions.mapFile), 'utf-8');
    const mapArr = await csv.parse(csvString);
    const records = [];
    let inserts = "";
    // let result = "";
    const ArrRu = [];
    const ArrEn = [];
    const objTemplate = { "filename" : "" };
    
    for (let x = 0; x < mapArr.length; x++) {
        let [ru, en, title] = mapArr[x]; // , ...rest
        ArrRu.push(ru);
        ArrEn.push(en);
        objTemplate[en] = "";
        inserts += `INSERT INTO ${table}_fields (name_in, name_code, name_out) VALUES('${ru}', '${en}', '${title||ru}');`;
    }
    
    const fields =  Object.keys(objTemplate);
    const scheme = `DROP TABLE IF EXISTS ${table}; DROP TABLE IF EXISTS ${table}_fields;
    CREATE TABLE ${table} (id INTEGER PRIMARY KEY, ${fields.join(" TEXT, ")} TEXT);
    CREATE TABLE ${table}_fields (
        id   INTEGER PRIMARY KEY,
        name_in TEXT,
        name_code TEXT,
        name_out TEXT
    ); 
    ${inserts}`;
    
    db.exec(scheme);
    
    const insSQL = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(x => '@'+x).join(',')})`;
    // console.log(insSQL);
    const insert = db.prepare(insSQL);
    const insertMany = db.transaction((items) => {
      for (const item of items) {
          // console.log(item["filename"]);
          item["cir"] = item["cir"].replace("С", "C");
          insert.run(item);
      }
    });    
    
    fs.readdirSync(dataDir).forEach( (file) => {
      const content = fs.readFileSync(path.join(appDir, 'data', file), 'utf-8').split("\n");
      const len = content.length;
      // result += "\n"+file;
      const record =  { ...objTemplate }; 
      record["filename"] = file;
      let datum = "";
      let current = "";
      // console.log(file);
      // console.log(record);
      
      for (let i = 0; i < len; i++) {
          const line = content[i].trim();
          // <b>[Датировка]</b>
          const match = line.replace(/<[^>]+>/g, '').match(/^\[(.*?)\]$/);
          
          if (match && match[1] && ArrRu.includes(match[1])){
                if (current && datum) {
                    record[current] = datum.trim();
                }
                // current = mapping[match[1]];
                current =  ArrEn[ArrRu.indexOf(match[1])];
                datum = "";
                // console.log(plain);
                // result += " "+ mapping[plain];
               // or something in square brackets that is not a proper header
          } else {
              datum += line + " ";
          }
      }
      // console.log(record.filename);
      records.push(record);
      // if (records.length>1) {
        // sdfdasfg()
      // }
    });
    // console.log(records[20]);
      // for (const item of records) {
          // // console.log(item["filename"]);
      // }
    // const file = "CIR0001 v.171204 AG.txt"
    // const sorted = Object.keys(counter).sort(function(a,b){return counter[b]-counter[a]})  
    // for (let x in sorted){
        // // result+= `${counter[sorted[x]]}: ${sorted[x]}\n`;
        // result+= `${sorted[x]}\n`;
    // }
    insertMany(records);
    fs.writeFileSync(dbgFile, JSON.stringify(records, null, 2));      
})();