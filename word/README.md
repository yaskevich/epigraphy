# DocX Converter
## for Descriptions stored in Microsoft Word files

#### Prerequisites

- Perl
- Microsoft Office 

Tested on Microsoft Windows 7 x64, Perl v5.26.1 (Strawberry Perl), Microsoft Office 2013.

#### Processing

These actions are to be performed on a Microsoft Windows PC.

The only reason is that content of *docx* files is extracted via **OLE interface of Microsoft Word** application.

1. Create `docx` directory inside the directory with Perl scripts.
2. Put descrtiptions files there (in *docx* format)
3. Open Command Prompt in this directory or navigate it there.
4. Execute`perl batch.pl` in Command Prompt

The `data` directory will be created. The files with *html* extension contain preprocessed content and the ones with *txt* are source files for database import.

#### Importing into database

After database was populated with basic data from Google Spreadsheet, one can push descriptions content there. 

These actions are meant to be performed on a server, although if one set up the environment, everything should work anywhere.

1. Move `data` directory to the root of `epigraphy` project (level up).
2. Execute `node cli.js -d`

Now the project database contains information of descriptions and the web server can provide these data to front-end queries of users.

#### Pipeline structure

This subproject consists of 3 Perl files.

- `epi-word-to-html.pl` – receives path to *docx* file as a first argument, calls the [OLE API](https://en.wikipedia.org/wiki/OLE_Automation) to extract the file content, after that it saves the extracted data as HTML file. The file path has to be provided as a second argument.
- `epi-strip-html.pl` – receives path to HTML file as a first argument, reads its content and then strips unnecessary tags and converts the data into simple annotation which is ready to be put into the database. The content is saved as a text file. The file path has to be provided as a second argument
- `batch.pl` - script to run batch job of file processing. It reads `docx` directory and sequentially sends every file to processing queue producing in `data` directory two output files (HTML, text) for every one input file (*docx*).