'use strict';

const fs = require('fs');
const path = require('path');
const csv = require('async-csv');
const sqlite = require('better-sqlite3');

function processRow(datacolumns, len){
	let realdata  = "";
	const datum = [];
	
	for (let i = 0; i < len; i++) {
		const c  = datacolumns[i];
		let content = "";
		
        if (Reflect.getOwnPropertyDescriptor(c, "effectiveValue")) {
             
				const v = c["userEnteredValue"];
				// https://rdrr.io/github/bradgwest/googleSheetsR/man/ExtendedValue.html
				content = v["stringValue"] || v["numberValue"];
				
				if (content !== c["formattedValue"]){
					content = '#' + content;
				}
				content = c["formattedValue"];
                // if (i === 28){
                    // const res = content.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})[\s\.\,]/);
                    // // let new_content = res?`${res[3]}-${res[2]}-${res[1]}`: "FAIL "+content;
                    // let new_content = res?`${res[3]}-${res[2]}-${res[1]}`: '';
                    // console.log(datum[0]+"\t"+new_content);
                // }
		} 
        
		datum[i] = content;
		if (content){ realdata += content; }
	}
	return realdata ? datum : [];
}


async function importSheet(db, options) {
    const {table, sheet, mapFile, dbgFile} = options;
    
    const csvString = fs.readFileSync(mapFile, 'utf-8');
    const mapArr = await csv.parse(csvString);
    
    // console.log(mapArr);
    
    const mapRuEn = {};
    const mapEnRu = {};
    
    for (let x = 0; x < mapArr.length; x++) {
        let [ru, en, ...rest] = mapArr[x];
        mapRuEn[ru] = en;
        mapEnRu[en] = ru;
        // console.log("==",mapArr[x]);
    }
    
  
    // console.log(bb);
    // console.log(mapEnRu);
    // console.log(JSON.stringify(mapEnRu));
    
    // return;
    
    const scheme = `
        DROP TABLE IF EXISTS ${table}; 
        DROP TABLE IF EXISTS ${table}_features; 
        CREATE TABLE ${table} (id INTEGER PRIMARY KEY, ${Object.keys(mapEnRu).join(" TEXT, ")} TEXT);
        CREATE TABLE ${table}_features (
            id   INTEGER PRIMARY KEY,
            f TEXT,
            v TEXT
        )`;
        
    // console.log(scheme);  
    // return
    db.exec(scheme);

    const colnames = [];
    const colnames0 = [];


    const big = {};

    let output = "";
    const sqlArr = [];
    
    if (sheet) {
        const row = sheet.data[0];
        // const cols = Object.keys(row["rowData"][0]["values"]);
        const cols = row["rowData"][0]["values"];
        const total = row["rowData"].length;
        const totalData = total - 1;
        let unkFieldsCounter = 0;
        for (const c of cols) {
            if (Reflect.getOwnPropertyDescriptor(c, "effectiveValue")) {
                const str = c["userEnteredValue"]["stringValue"];
                // console.log("|"+str+"|");
                var fieldName  = "";
                if (Reflect.getOwnPropertyDescriptor(mapRuEn, str)) {
                    // console.log(mapping[str]);
                    fieldName = mapRuEn[str];
                } else {
                    fieldName = "unk"+unkFieldsCounter++;
                    console.error(str);
                }
                
                colnames.push(fieldName);
                colnames0.push(str);
                big[fieldName] = [];                
                
            }
        }
        
    const insSQL = `INSERT INTO ${table} (${colnames.join(', ')}) VALUES (${colnames.map(x => '@'+x).join(',')})`;
    // console.log(insSQL);
    const insert = db.prepare(insSQL);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
          insert.run(item);
      }
    });
            

    const insFeatSQL = `INSERT INTO ${table}_features (f, v) VALUES (@f, @v)`;
    const insFeat = db.prepare(insFeatSQL);

    
        
        let counter = 0;
        for (let r = 1; r < total; r++) {
            output += `■ ${r} (${totalData})\n`;
            const dcols = row["rowData"][r]["values"];
            let rdata = processRow(dcols, colnames.length);
            if (rdata.length) {
                counter++;
                const sqldata = {};
                const info = rdata.map((x, i) => {
                const v = x?x.trim():null;
                
                big[colnames[i]].push(v);
                sqldata[colnames[i]] = v;
                
                return `${i}\t${colnames[i].padStart(16, ' ')} :: ${v}`;
                
                }).join('\n');
                output += info + "\n";
                sqlArr.push(sqldata);
            }
        }
        
        const idMapping = {};
        
        for (let p in big) {
            if (Reflect.getOwnPropertyDescriptor(big, p)) {
                // console.log(p);
                const un = [...new Set(big[p])];
                const vlen = un.length;
                if (vlen < 50) {
                    for (const u of un) {
                        let h = insFeat.run({"f": p, "v": u});
                        const lid = h["lastInsertRowid"];
                        if (!Reflect.getOwnPropertyDescriptor(idMapping, p)){
                            idMapping[p] = {};
                        }
                        idMapping[p][u] = String(lid);
                        // console.log(lid);
                    }
                }
            }
        }
        
        var sqlArrMod = sqlArr.map(function(x) {
            let a = {};
            for (let [key, value] of Object.entries(x)) {
              // console.log(`${key}: ${value}`);
              a[key] = Reflect.getOwnPropertyDescriptor(idMapping, key)? idMapping[key][value] : value;
            }
            return a;
        });
        
        insertMany(sqlArrMod);
    
        let uniq = "";
        
        for (let [key, value] of Object.entries(big)) {	
            fs.writeFileSync(path.join("all", key+'.txt'), value.join("\n"));
            uniq += "\n\n♦ " + key + " [" + mapEnRu[key] + "]\n" + [...new Set(value)].join("\n");
        }
        output += uniq;
        output += `rows in sheet ${totalData} || rows with data ${counter}`;
        fs.writeFileSync(path.join( __dirname, dbgFile), output);
    }  
} 


(async () => {

    const dbFile = "cir.db";
    const srcFile = "corpus.json";
    // if (fs.existsSync(dbFile)) {
        // fs.unlinkSync(dbFile);
    // }    
    // const curtime = Math.round((new Date()).getTime() / 1000);
    // console.log("Current time", curtime);
    
    const rawdata = fs.readFileSync(srcFile);
    const doc = JSON.parse(rawdata);
    
    const tasks = [
        {"table": "corpus", "sheet": doc.data.sheets[0], "mapFile": "mapping1.csv",  "dbgFile": "out-cir.txt"},
        {"table": "places", "sheet": doc.data.sheets[3], "mapFile": "mapping3.csv",  "dbgFile": "out-places.txt"},
    ];
    // let db = new sqlite(dbFile, { verbose: console.log });
    let db = new sqlite(dbFile);
    
    // const [resultCorpus, resultPlaces] = 
    await Promise.all(tasks.map(t => importSheet(db, t)));
    // await importSheet(db, tasks[0])
    
    // console.log("OK");
})();
