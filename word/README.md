# DocX Converter
## for Descriptions stored in Microsoft Word files (Russian Corpus of Inscriptions)

#### Prerequisites

- Perl
- Microsoft Office 

Tested on Microsoft Windows 7 x64, Perl v5.26.1 (Strawberry Perl), Microsoft Office 2013.

#### Processing

These actions are to be performed on a Microsoft Windows PC.

The only reason is that content of *docx* files is extracted via OLE interface of Microsoft Word application.

1. Create `docx` directory inside the directory with Perl scripts.
2. Put descrtiptions files there (in *docx* format)
3. Open Command Prompt in this directory or navigate it there.
4. Execute`perl batch.pl` in Command Prompt

The `data` directory will be created. The files with *html* extension contain preprocessed content and the ones with *txt* are source files for database import.

#### Importing into database

After database was populated with basic data from Google Spreadsheet, one can push descriptions content there. 

These actions are meant to be performed on a server, although if one set up the environment, everything should work anywhere.

1. Move `data` directory to the root of `epigraphy` project (level up).
2. Execute `node scripts/process-descriptions.js`

Now the project database contains information of descriptions as well and the web application can provide these data to front-end queries of users.