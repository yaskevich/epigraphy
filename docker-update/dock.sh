docker build  --build-arg ssh_prv_key1="$(cat id_rsa_epigraphy)" --build-arg ssh_prv_key2="$(cat id_rsa_epidata)" -t yaskevich/epigraphy .
docker rm -f cir
docker run --name cir -p 127.0.0.1:3333:7528 -d yaskevich/epigraphy:latest
