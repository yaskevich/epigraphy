docker build -t yaskevich/epigraphy .
docker rm -f cir
docker run --name cir -p 127.0.0.1:3333:7528 -d yaskevich/epigraphy:latest
