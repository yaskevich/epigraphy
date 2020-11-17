'use strict';

const fs = require('fs');
const {google} = require('googleapis');
const path = require('path');
const config = require('config');
const cfg = config.get('app');
const cli = require('commander');
const csv = require('async-csv');
const SQLite = require('better-sqlite3');
// const archiver = require('archiver');
// const appDir = path.join(__dirname);
const appDir = __dirname;

cli
    .option('-d, --desc', 'parse descriptions')
    .option('-l, --load', 'load spreadsheet')
    .option('-g, --google', 'load and parse data from Google.Disk')
    .option('-j, --json', 'parse JSON')
    .option('-a, --all', 'perform all tasks')
    .option('-v, --verbose', 'Verbose output');

cli.parse(process.argv);

// https://github.com/googleapis/google-api-nodejs-client/blob/197b0199a14c7ae05045a8f2f7ad185ada9210ad/samples/sheets/quickstart.js
// const apis = google.getSupportedAPIs();
// console.log(apis);

/**
 * This function downloads Google Spreadsheet document as a JSON file.
 * @param {string} keyPath is a path to key with Google JWT token.
 * @param {string} id is an identifer of the Google Spreadsheet document.
 * @returns {object} representation of Google Spreadsheet as an object or, in case of error, empty object (with/without error description).
 */
async function getSheet(keyPath, id) {
    if (id) {
        const sheet_defaults = {
            "range": "A:ZZZ",
            "filepath": '',
            'justget': false,
            'full': false
        };
        if (keyPath) {
            const auth = new google.auth.GoogleAuth({
                keyFile: keyPath,
                scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
            });
            const client = await auth.getClient();
            const sheets = google.sheets({
                version: 'v4',
                auth: client,
            });
            const opts = {
                spreadsheetId: id
            };
            let downloadFormatted = true;
            // downloadFormatted  = false;

            let func = sheets.spreadsheets;
            if (downloadFormatted) {
                opts.includeGridData = true;
                // opts.includeGridData = false;
            } else {
                func = func.values;
                opts.range = sheet_defaults.range;
            }
            return func.get(opts);
        }
    }
    return {};
}

/**
 * This function downloads Google Spreadsheet document and stores it as a JSON file.
 * @param {Array} keyPathArray is a path to key with Google JWT token represented as an array.
 * @param {string} id is an identifer of the Google Spreadsheet document.
 * @param {string} jsonFileName is a filename of downloaded Google Spreadsheet content stored as a file locally.
 */
async function downloadSheets(keyPathArray, id, jsonFileName) {
    const keyPath = path.join(appDir, ...keyPathArray);
    if (keyPath && fs.existsSync(keyPath)) {
        const res = await getSheet(keyPath, id);
        try {
            // const datum = JSON.stringify(resp, null, 2);
            // const archPath = path.join(__dirname, 'data', fname + '.zip');
            fs.writeFileSync(jsonFileName, JSON.stringify(res));
            // fs.writeFileSync("data-cir.json", JSON.stringify(resp.data.sheets[0], null, 2));
            // fs.writeFileSync("data-places.json", JSON.stringify(resp.data.sheets[3], null, 2));
            // const output = fs.createWriteStream(archPath);
            // const archive = archiver('zip', { zlib: { level: 9 } });
            // archive.pipe(output);
            // archive.append(datum, { name: 'corpus.json' });
            // archive.finalize();
        } catch (e) {
            console.error(e.code);
        }
        if (Reflect.getOwnPropertyDescriptor(res, "error")) {
            console.log(res.error);
        }
    } else {
        console.error("Problem with Google JWS token!");
    }
}

/**
 * This helper function process a row of a spreadsheet, extracting values.
 * @param {Array} datacolumns is array of all columns of a document.
 * @param {number} len is amount of columns to process
 * @returns {Array} array with extracted data.
 */
function processRow(datacolumns, len) {
    let realdata = "";
    const datum = [];

    for (let i = 0; i < len; i++) {
        const c = datacolumns[i];
        let content = "";

        if (Reflect.getOwnPropertyDescriptor(c, "effectiveValue")) {

            const v = c["userEnteredValue"];
            // https://rdrr.io/github/bradgwest/googleSheetsR/man/ExtendedValue.html
            content = v["stringValue"] || v["numberValue"];

            if (content !== c["formattedValue"]) {
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
        if (content) {
            realdata += content;
        }
    }
    return realdata ? datum : [];
}

/**
 * This function import Google Spreadsheet's sheet into database table.
 * @param {object} db is a database object provided by SQLite module
 * @param {object} book is a sheets fragment of JSON representation of the Workbook from Google Spreadsheet
 * @param {object} options is a config section of this task (e.g. for inscriptions or places)
 */
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
        fs.mkdir(path.dirname(dbgFilePath), {
            recursive: true
        }, (err) => {
            if (err) {
                throw err;
            }
        });
        if (dbgMode > 1) {
            fs.mkdir(dbgDirPath, {
                recursive: true
            }, (err) => {
                if (err) {
                    throw err;
                }
            });
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
        // const cols = Object.keys(row["rowData"][0]["values"]);
        const cols = row["rowData"][0]["values"];
        const total = row["rowData"].length;
        const totalData = total - 1;
        let unkFieldsCounter = 0;
        for (const c of cols) {
            if (Reflect.getOwnPropertyDescriptor(c, "effectiveValue")) {
                const str = c["userEnteredValue"]["stringValue"];
                // console.log("|"+str+"|");
                var fieldName = "";
                if (Reflect.getOwnPropertyDescriptor(mapRuEn, str)) {
                    // console.log(mapping[str]);
                    fieldName = mapRuEn[str];

                    colnames.push(fieldName);
                    colnames0.push(str);
                    big[fieldName] = [];
                } else {
                    // field not in a schemes !!!
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

        // console.log(scheme);  
        // return
        db.exec(scheme);

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
                // console.log(p);
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
                        // console.log(lid);
                    }
                }
            }
        }

        var sqlArrMod = sqlArr.map(function(x) {
            let a = {};
            for (let [key, value] of Object.entries(x)) {
                // console.log(`${key}: ${value}`);
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

/**
 * This function process a list of selected sheets from a whole document and put extracted content into database.
 * @param {string} dbPath is a path to database where to put the data.
 * @param {string} jsonPath is a name of JSON file where Google Spreadsheet content is stored.
 * @param {string} tasksArray is an array of objects that contain such data as number of sheet in workbook, path to mapping file, path to debugging file, path to debugging directory, and debugging mode (see config format)
 */
async function importSheets(dbPath, jsonPath, tasksArray) {
    const dbFile = path.join(appDir, dbPath);
    // if (fs.existsSync(dbFile)) { fs.unlinkSync(dbFile); }    
    const srcFile = path.join(appDir, jsonPath);
    const rawdata = fs.readFileSync(srcFile);
    const doc = JSON.parse(rawdata);
    const db = new SQLite(dbFile);
    // const [resultCorpus, resultPlaces] =
    await Promise.all(tasksArray.map(t => importSheet(db, doc.data.sheets, t)));
    // await importSheet(db, tasks[0])
}

/**
 * This function process a list of selected sheets from a whole document and put extracted content into database.
 * @param {string} dbPath is a path to database where to put the data.
 * @param {string} dbgFilePath is a path to file where to put debugging info.
 * @param {string} sourceDir is a path to directory where files to be processed are stored.
 * @param {string} tableName is a name of the table in which descriptions are placed.
 * @param {string} mapFilePath is a path to mapping file (stores mappings of in-file headings to names of table columns).
 */
async function processDescriptions(dbPath, dbgFilePath, sourceDir, tableName, mapFilePath) {
    const db = new SQLite(path.join(appDir, dbPath));
    const dbgFile = path.join(appDir, ...dbgFilePath);
    const dataDir = path.join(appDir, sourceDir);
    const csvString = fs.readFileSync(path.join(__dirname, ...mapFilePath), 'utf-8');
    const mapArr = await csv.parse(csvString);
    const records = [];
    let inserts = "";
    // let result = "";
    const ArrRu = [];
    const ArrEn = [];
    const objTemplate = {
        "filename": ""
    };

    for (let x = 0; x < mapArr.length; x++) {
        let [ru, en, title] = mapArr[x]; // , ...rest
        ArrRu.push(ru);
        ArrEn.push(en);
        objTemplate[en] = "";
        inserts += `INSERT INTO ${tableName}_fields (name_in, name_code, name_out) VALUES('${ru}', '${en}', '${title||ru}');`;
    }

    const fields = Object.keys(objTemplate);
    const scheme = `DROP TABLE IF EXISTS ${tableName}; DROP TABLE IF EXISTS ${tableName}_fields;
    CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, ${fields.join(" TEXT, ")} TEXT);
    CREATE TABLE ${tableName}_fields (
        id   INTEGER PRIMARY KEY,
        name_in TEXT,
        name_code TEXT,
        name_out TEXT
    ); 
    ${inserts}`;

    db.exec(scheme);

    const insSQL = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${fields.map(x => '@'+x).join(',')})`;
    // console.log(insSQL);
    const insert = db.prepare(insSQL);
    const insertMany = db.transaction((items) => {
        for (const item of items) {
            // console.log(item["filename"]);
            item["cir"] = item["cir"].replace("С", "C");
            insert.run(item);
        }
    });

    fs.readdirSync(dataDir).forEach((file) => {
        const content = fs.readFileSync(path.join(appDir, 'data', file), 'utf-8').split("\n");
        const len = content.length;
        // result += "\n"+file;
        const record = {
            ...objTemplate
        };
        record["filename"] = file;
        let datum = "";
        let current = "";
        // console.log(file);
        // console.log(record);

        for (let i = 0; i < len; i++) {
            const line = content[i].trim();
            // <b>[Датировка]</b>
            const match = line.replace(/<[^>]+>/g, '').match(/^\[(.*?)\]$/);

            if (match && match[1] && ArrRu.includes(match[1])) {
                if (current && datum) {
                    record[current] = datum.trim();
                }
                // current = mapping[match[1]];
                current = ArrEn[ArrRu.indexOf(match[1])];
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
}
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 
// wrappers that take all parameters from config
/**
 * This wrapper function which runs descriptions extraction: it takes all the arguments from config file and passes them to processDescriptions function.
 */
async function processDescriptionsWrapper() {
    return processDescriptions(cfg.dbName, cfg.sources.descriptions.output, cfg.sources.descriptions.dir, cfg.sources.descriptions.table, cfg.sources.descriptions.mapFile);
}

/**
 * This wrapper function which runs descriptions extraction: it takes all the arguments from config file and passes them to importSheets function.
 */
async function importSheetsWrapper() {
    const tasks = [cfg.sources.inscriptions, cfg.sources.places];
    return importSheets(cfg.dbName, cfg.sourceFile, tasks);
}

/**
 * This wrapper function which runs descriptions extraction: it takes all the arguments from config file and passes them to downloadSheets function.
 */
async function downloadSheetsWrapper() {
    return downloadSheets(cfg.keyFile, cfg.docID, cfg.sourceFile);
}

// processing command line arguments
(async () => {
	if (cli.desc) {
		if (cli.verbose) {
			console.log("Task: parse files with descriptions into database");
		}
		await processDescriptionsWrapper();
	} else if (cli.load) {
		if (cli.verbose) {
			console.log("Task: download Google Spreadsheet and store it as JSON");
		}
		await downloadSheetsWrapper();
	} else if (cli.json) {
		if (cli.verbose) {
			console.log("Task: parse JSON into database");
		}
		await importSheetsWrapper();
	} else if (cli.google) { // two basic tasks
		if (cli.verbose) {
			console.log("Task: download Google Spreadsheet, parse and put into database");
		}
		if (cli.verbose) { 
			console.log(">>Downloading...");
		}		
		await downloadSheetsWrapper();
		if (cli.verbose) { 
			console.log(">>Importing JSON...");
		}		
		await importSheetsWrapper();
	} else if (cli.all) {
		if (cli.verbose) {
			console.log(">>All tasks together");
		}
		
		if (cli.verbose) { 
			console.log(">>Downloading...");
		}
		await downloadSheetsWrapper();
		
		if (cli.verbose) { 
			console.log(">>Importing JSON...");
		}
		await importSheetsWrapper();

		if (cli.verbose) { 
			console.log(">>Importing descriptions...");
		}
		await processDescriptionsWrapper();
		if (cli.verbose) { 
			console.log(">>Done!");
		}
	}
})();
