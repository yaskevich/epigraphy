'use strict';

const fs = require('fs');
const {google} = require('googleapis');
const path = require('path');
const config = require('config');
const cfg = config.get('app');
const cli = require('commander');
const csv = require('async-csv');
const SQLite = require('better-sqlite3');
const appDir = path.join(__dirname); //__dirname

cli
  .option('-d, --desc', 'parse descriptions')
  .option('-l, --load', 'load spreadsheet')
  .option('-g, --google', 'load and parse data from Google.Disk')
  .option('-j, --json', 'parse JSON')
  .option('-a, --all', 'perform all tasks')
  .option('-v, --verbose', 'Verbose output');

cli.parse(process.argv);



let isAuthorized = false;
async function getSheet(keyPath, id) {
    if (id) {
        const sheet_defaults = { "range":"A:ZZZ", "filepath": '', 'justget': false, 'full': false};
        if (!isAuthorized && keyPath) {
            
            const auth = new google.auth.GoogleAuth({
                keyFile: keyPath,
                scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
              });
            const client = await auth.getClient();
            const sheets = google.sheets({ version: 'v4', auth: client, });
        
            const opts = { spreadsheetId: id };
            
            let downloadFormatted = true;
            
            let func = sheets.spreadsheets;
            if (downloadFormatted){
                opts.includeGridData = true;
            } else {
                func = func.values;
                opts.range = sheet_defaults.range;
            }
            
            const resp  = await func.get(opts);
            
            try {

                fs.writeFileSync("corpus.json", JSON.stringify(resp));
            }
            catch (e) {
               return { "error": e.code };
            }
        }
    }
    return {};
}

async function downloadSheets(key, id) {    
    const keyPath = path.join(appDir, ...key); 
	if (keyPath && fs.existsSync(keyPath)) {
		const res = await getSheet(keyPath, id);
		if (Reflect.getOwnPropertyDescriptor(res, "error")) {
			console.log(res.error);
		}
	} else {
		console.error("Problem with Google JWS token!");
	}
}

function processRow(datacolumns, len) {
    let realdata = "";
    const datum = [];

    for (let i = 0; i < len; i++) {
        const c = datacolumns[i];
        let content = "";

        if (Reflect.getOwnPropertyDescriptor(c, "effectiveValue")) {

            const v = c["userEnteredValue"];
            content = v["stringValue"] || v["numberValue"];

            if (content !== c["formattedValue"]) {
                content = '#' + content;
            }
            content = c["formattedValue"];
        }

        datum[i] = content;
        if (content) {
            realdata += content;
        }
    }
    return realdata ? datum : [];
}
async function importSheet(db, book, options) {
    const {
        table,
        sheetIndex,
        mapFile,
        dbgFile,
		dbgDir,
		dbgMode
    } = options;

	const dbgFilePath = path.join(appDir, ...dbgFile);
	const dbgDirPath = path.join(appDir, ...dbgDir);

	if (dbgMode) {
		fs.mkdir(require('path').dirname(dbgFilePath), { recursive: true }, (err) => { if (err) throw err; });
		if (dbgMode > 1) {
			fs.mkdir(dbgDirPath, { recursive: true }, (err) => { if (err) throw err; });
		}
	}

    const sheet = book[sheetIndex];

    const csvString = fs.readFileSync(path.join(__dirname, ...mapFile), 'utf-8');
    const mapArr = await csv.parse(csvString);

    const mapRuEn = {};
    const mapEnRu = {};

    let inserts = "";
    for (let x = 0; x < mapArr.length; x++) {
        let [ru, en, title] = mapArr[x]; // , ...rest
        mapRuEn[ru] = en;
        mapEnRu[en] = ru;
        inserts += `INSERT INTO ${table}_fields (name_in, name_code, name_out) VALUES('${ru}', '${en}', '${title||ru}');`;
    }




    const colnames = [];
    const colnames0 = [];


    const big = {};

    let output = "";
    const sqlArr = [];

    if (sheet) {
        const row = sheet.data[0];
        const cols = row["rowData"][0]["values"];
        const total = row["rowData"].length;
        const totalData = total - 1;
        let unkFieldsCounter = 0;
        for (const c of cols) {
            if (Reflect.getOwnPropertyDescriptor(c, "effectiveValue")) {
                const str = c["userEnteredValue"]["stringValue"];
                var fieldName = "";
                if (Reflect.getOwnPropertyDescriptor(mapRuEn, str)) {
                    fieldName = mapRuEn[str];
					
					colnames.push(fieldName);
					colnames0.push(str);
					big[fieldName] = [];
                } else {
                    fieldName = "unk" + unkFieldsCounter++;
					if (cli.verbose) {
						console.log(str);
					}
                }
            }
        }
		
		const scheme = `
			DROP TABLE IF EXISTS ${table}; 
			DROP TABLE IF EXISTS ${table}_features; 
			DROP TABLE IF EXISTS ${table}_fields; 
			CREATE TABLE ${table} (id INTEGER PRIMARY KEY, ${Object.keys(mapEnRu).join(" TEXT, ")} TEXT);
			CREATE TABLE ${table}_features (
				id   INTEGER PRIMARY KEY,
				f TEXT,
				v TEXT
			);
			CREATE TABLE ${table}_fields (
				id   INTEGER PRIMARY KEY,
				name_in TEXT,
				name_code TEXT,
				name_out TEXT
			);
			${inserts}`;
		db.exec(scheme);

        const insSQL = `INSERT INTO ${table} (${colnames.join(', ')}) VALUES (${colnames.map(x => '@'+x).join(',')})`;
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
                    const v = x ? x.trim() : null;

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
                const un = [...new Set(big[p])];
                const vlen = un.length;
                if (vlen < 50) {
                    for (const u of un) {
                        let h = insFeat.run({
                            "f": p,
                            "v": u
                        });
                        const lid = h["lastInsertRowid"];
                        if (!Reflect.getOwnPropertyDescriptor(idMapping, p)) {
                            idMapping[p] = {};
                        }
                        idMapping[p][u] = String(lid);
                    }
                }
            }
        }

        var sqlArrMod = sqlArr.map(function(x) {
            let a = {};
            for (let [key, value] of Object.entries(x)) {
                a[key] = Reflect.getOwnPropertyDescriptor(idMapping, key) ? idMapping[key][value] : value;
            }
            return a;
        });

        insertMany(sqlArrMod);

        let uniq = "";
        for (let [key, value] of Object.entries(big)) {
			if (dbgMode > 1) {
				fs.writeFileSync(path.join(dbgDirPath, key + '.txt'), value.join("\n"));
			}
            uniq += "\n\n♦ " + key + " [" + mapEnRu[key] + "]\n" + [...new Set(value)].join("\n");
        }
        output += uniq;
        output += `rows in sheet ${totalData} || rows with data ${counter}`;
		if (dbgMode) {
			fs.writeFileSync(dbgFilePath, output);
		}
    }
}

async function importSheets(dbPath, jsonPath, tasksArray) {
    const dbFile = path.join(appDir, dbPath);
    const srcFile = path.join(appDir, jsonPath);
    const rawdata = fs.readFileSync(srcFile);
    const doc = JSON.parse(rawdata);
    const db = new SQLite(dbFile);
    await Promise.all(tasksArray.map(t => importSheet(db, doc.data.sheets, t)));
}

async function processDescriptions(dbPath, dbgFilePath, sourceDir, tableName, mapFilePath) {
    const db = new SQLite(path.join(appDir, dbPath));
    const dbgFile = path.join(appDir, ...dbgFilePath);
    const dataDir = path.join(appDir, sourceDir);
    const table = tableName;
    const csvString = fs.readFileSync(path.join(__dirname, ...mapFilePath), 'utf-8');
    const mapArr = await csv.parse(csvString);
    const records = [];
    let inserts = "";
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
    const insert = db.prepare(insSQL);
    const insertMany = db.transaction((items) => {
      for (const item of items) {
          item["cir"] = item["cir"].replace("С", "C");
          insert.run(item);
      }
    });    
    
    fs.readdirSync(dataDir).forEach( (file) => {
      const content = fs.readFileSync(path.join(appDir, 'data', file), 'utf-8').split("\n");
      const len = content.length;
      const record =  { ...objTemplate }; 
      record["filename"] = file;
      let datum = "";
      let current = "";
      
      for (let i = 0; i < len; i++) {
          const line = content[i].trim();
          const match = line.replace(/<[^>]+>/g, '').match(/^\[(.*?)\]$/);
          
          if (match && match[1] && ArrRu.includes(match[1])){
                if (current && datum) {
                    record[current] = datum.trim();
                }
                current =  ArrEn[ArrRu.indexOf(match[1])];
                datum = "";
          } else {
              datum += line + " ";
          }
      }
      records.push(record);
    });
    insertMany(records);
    fs.writeFileSync(dbgFile, JSON.stringify(records, null, 2));      
}

async function processDescriptionsWrapper() {
	processDescriptions(cfg.dbName, cfg.sources.descriptions.output, cfg.sources.descriptions.dir, cfg.sources.descriptions.table, cfg.sources.descriptions.mapFile);
}

async function importSheetsWrapper() {
	const tasks = [cfg.sources.inscriptions, cfg.sources.places];
	importSheets(cfg.dbName, cfg.sourceFile, tasks);
}

async function downloadSheetsWrapper() {
	downloadSheets(cfg.keyFile, cfg.docID);
}

if (cli.desc) {
	if (cli.verbose) {
		console.log("Task: parse files with descriptions into database");
	}
	processDescriptionsWrapper();
} else if (cli.load) {
	if (cli.verbose) {
		console.log("Task: download Google Spreadsheet and store it as JSON");
	}
	downloadSheetsWrapper();
} else if (cli.json) {
	if (cli.verbose) {
		console.log("Task: parse JSON into database");
	}
	importSheetsWrapper();
} else if (cli.google) { // two basic tasks
	if (cli.verbose) {
		console.log("Task: download Google Spreadsheet, parse and put into database");
	}
	downloadSheetsWrapper();
	importSheetsWrapper();
} else if (cli.all) {
	if (cli.verbose) {
		console.log("All tasks together");
	}
	downloadSheetsWrapper();
	importSheetsWrapper();
	processDescriptionsWrapper();
}