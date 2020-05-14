'use strict';

const fs = require('fs');
// const archiver = require('archiver');
const {google} = require('googleapis');
const path = require('path');
const config = require('config');

//  https://github.com/googleapis/google-api-nodejs-client/blob/197b0199a14c7ae05045a8f2f7ad185ada9210ad/samples/sheets/quickstart.js

// Error: The service is currently unavailable.
    // at Request._callback (\google-auth-librar
// y\lib\transporters.js:85:15)
    // at Request.self.callback (\google-auth-li
// brary\node_modules\request\request.js:187:22)
    // at Request.emit (events.js:321:20)
    // at Request.<anonymous> (\google-auth-libr
// ary\node_modules\request\request.js:1044:10)
    // at Request.emit (events.js:321:20)
    // at IncomingMessage.<anonymous> (\google-a
// uth-library\node_modules\request\request.js:965:12)
    // at IncomingMessage.emit (events.js:333:22)
    // at endReadableNT (_stream_readable.js:1204:12)
    // at processTicksAndRejections (internal/process/task_queues.js:84:21) {
  // code: 503,
  // errors: [
    // {
      // message: 'The service is currently unavailable.',
      // domain: 'global',
      // reason: 'backendError'
    // }
  // ]
// }

// const apis = google.getSupportedAPIs();
// console.log(apis);

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
            // downloadFormatted  = false;
            
            let func = sheets.spreadsheets;
            if (downloadFormatted){
                opts.includeGridData = true;
                // opts.includeGridData = false;
            } else {
                func = func.values;
                opts.range = sheet_defaults.range;
            }
            
            // const fname = new Date()
                // .toLocaleString(
                    // 'ru-RU', 
                    // { "timeZone": "Europe/Moscow", "hour12": false }
                // )
                // .replace(/\W/g, "_");
                
            // const filepath = "data/"+fname+".json";
            
            const resp  = await func.get(opts);
            
            try {
                // const datum = JSON.stringify(resp, null, 2);
                // const archPath = path.join(__dirname, 'data', fname + '.zip');

                fs.writeFileSync("corpus.json", JSON.stringify(resp));
                // fs.writeFileSync("data-cir.json", JSON.stringify(resp.data.sheets[0], null, 2));
                // fs.writeFileSync("data-places.json", JSON.stringify(resp.data.sheets[3], null, 2));
                
                // const output = fs.createWriteStream(archPath);
                // const archive = archiver('zip', { zlib: { level: 9 } });
                // archive.pipe(output);
                // archive.append(datum, { name: 'corpus.json' });
                // archive.finalize();
            }
            catch (e) {
               return { "error": e.code };
            }
            
        }
    }
    return {};
}

(async () => {
    const cfg = config.get('app');
    const appDir = path.join(__dirname, ".."); //__dirname
    const keyPath = path.join(appDir, ...cfg.keyFile); 
    const res = await getSheet(keyPath, cfg.docID);
    if (Reflect.getOwnPropertyDescriptor(res, "error")) {
        console.log(res.error);
    }
})();