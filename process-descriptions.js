const path = require("path");
const dataDir = path.join(__dirname, 'data');
const fs = require('fs');
const sqlite = require('better-sqlite3');
const config = require('config');

const cfg = config.get('app');
// console.log(cfg);

const db = new sqlite(cfg.dbName);

const dbgFile = path.join(__dirname, cfg.sources.descriptions.output);

const mapping = {
	"CIR-код" : "cir",
	"OG-код" : "og",
	"Наименование" : "name",
	"Местоположение" : "site",
	"Местонахождение" : "place",
	"Авторы" : "authors",
	"Описание носителя" : "objdesc",
	"Дополнительные данные" : "extra",
	"Сведения о версиях документа" : "ver",
	"Описание надписи" : "insdesc",
	"Палеографический комментарий" : "com_paleo",
	"Филологический комментарий" : "com_phil",
	"Реально-исторический комментарий" : "com_hist",
	"Текстологический комментарий" : "com_text",
	"Датировка" : "dates",
	"История памятника" : "history",
	"Операторы документирования" : "operators",
	"Особенности структуры" : "struct",
	
	"Практическая транскрипция" : "transcript",
	
	"Транскрипция надписи" : "script",
	"Транскрипция" : "script",
	
	"Документирование" : "doc",
	"Полевое документирование" : "doc",
	"Сведения о документировании" : "doc",
	"Публикации" : "pubs",
	"Сведения о публикациях" : "pubs",
	"Перевод надписи": "translation"
};
let result = "";  


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

const records = [];

const fields =  ["filename", ...new Set(Object.values(mapping))]; 
const table = cfg.sources.descriptions.table;
const objTemplate = fields.reduce((o, key) => ({ ...o, [key]: ""}), {});

const scheme = `DROP TABLE IF EXISTS ${table}; 
				CREATE TABLE ${table} (id INTEGER PRIMARY KEY, ${fields.join(" TEXT, ")} TEXT);`;
// console.log(scheme);
db.exec(scheme);

fs.readdirSync(dataDir).forEach(file => {
  const content = fs.readFileSync(path.join(__dirname, 'data', file), 'utf-8').split("\n");
  const len = content.length;
  // result += "\n"+file;
  const record = Object.assign({}, objTemplate);
  record["filename"] = file;
  let datum = "";
  let current = "";
  // console.log(file);
  // console.log(record);
  
  for (let i = 0; i < len; i++) {
	  const line = content[i].trim();
	  // <b>[Датировка]</b>
	  const match = line.replace(/<[^>]+>/g, '').match(/^\[(.*?)\]$/);
	  if (match && match[1] && mapping.hasOwnProperty(match[1])){
			if (current && datum) {
				record[current] = datum.trim();
			}
			current = mapping[match[1]];
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


const insSQL = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(x => '@'+x).join(',')})`;
// console.log(insSQL);
const insert = db.prepare(insSQL);

// console.log(records[20]);

  // for (const item of records) {
	  // // console.log(item["filename"]);
  // }

const insertMany = db.transaction((items) => {
  for (const item of items) {
	  // console.log(item["filename"]);
	  item["cir"] = item["cir"].replace("С", "C");
	  insert.run(item);
  }
});

insertMany(records);

// const file = "CIR0001 v.171204 AG.txt"
// const sorted = Object.keys(counter).sort(function(a,b){return counter[b]-counter[a]})  
// for (let x in sorted){
	// // result+= `${counter[sorted[x]]}: ${sorted[x]}\n`;
	// result+= `${sorted[x]}\n`;
// }
fs.writeFileSync(dbgFile, JSON.stringify(records, null, 2));  