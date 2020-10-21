FROM node:latest as preparations
ARG ssh_prv_key1
ARG ssh_prv_key2
# RUN pwd
RUN mkdir -p /root/.ssh && \
    chmod 0700 /root/.ssh && \
    ssh-keyscan github.com > /root/.ssh/known_hosts && \
    echo "${ssh_prv_key1}" > /root/.ssh/id_rsa_epigraphy && echo "${ssh_prv_key2}" >> /root/.ssh/id_rsa_epidata && \
	chmod 600 /root/.ssh/id_rsa_epigraphy && chmod 600 /root/.ssh/id_rsa_epidata
RUN echo "Host github-epi\nHostname github.com\nIdentityFile /root/.ssh/id_rsa_epigraphy\nHost github-data\nHostname github.com\nIdentityFile /root/.ssh/id_rsa_epidata\n"  > /root/.ssh/config	
# RUN cat ~/.ssh/config	
RUN git clone git@github-data:yaskevich/epidata.git
RUN git clone git@github-epi:yaskevich/epigraphy.git
WORKDIR /epigraphy/
RUN rm -rf .??* && rm Dockerfile && rm *.sh && rm *.md && rm -rf word && rm -rf /root/.ssh/
COPY jwt.json jwt.json
RUN npm install
RUN export NODE_ENV=production
RUN npm run sync
RUN rm corpus.json
RUN ln -s /epidata/data /epigraphy/data
RUN ln -s /epidata/pictures /epigraphy/pictures
RUN node scripts/process-descriptions.js
RUN rm -rf node_modules
RUN rm /epigraphy/data

FROM node:latest AS production
# RUN echo "Europe/Moscow" > /etc/timezone 
# RUN dpkg-reconfigure -f noninteractive tzdata
# RUN apt-get update && apt-get -y install cron && apt-get clean
COPY --from=preparations /epigraphy/ /app/
# COPY . /app/
WORKDIR /app/
RUN ls -a
RUN npm install --only=production
RUN export NODE_ENV=production
# RUN rm -rf data
RUN npm install pm2 -g
RUN npm audit fix
RUN touch corpus.json
RUN touch test.log
# RUN node index.js
# RUN echo "0 2 * * * npm run sync --prefix /app/ > /dev/null 2>&1" > /etc/cron.d/cjob
# RUN (echo "*/10 * * * * npm run sync --prefix /app/ && pm2 restart epi && date >> /app/test.log\n") | crontab -

# RUN service cron start
# RUN service cron status
# RUN echo "* * * * * root date >> /app/test.log\n" >> /etc/cron.d/cjob
# RUN echo "* * * * * root date >> /app/test.log 2>&1\n\n" >> /etc/cron.d/cjob
# RUN echo "* * * * *	root	/usr/local/bin/node /usr/local/bin/pm2 restart epi\n\n" >> /etc/cron.d/cjob
# RUN chmod 0644 /etc/cron.d/cjob

# CMD ["cron", "-f"]
# RUN service cron start


# RUN crontab /etc/cron.d/cjob

# ADD crontab /etc/cron.d/test-cron
# RUN chmod a+x /etc/cron.d/test-cron
# RUN touch /var/log/cron.log
# # CMD cron
# RUN service cron start


# # create two test applications that we will launch using cron
# RUN mkdir /app1 && echo 'echo `date +"%H:%M:%S"` - This is sample application 1!' > /app1/test.sh && chmod +x /app1/test.sh
# RUN mkdir /app2 && echo 'echo `date +"%H:%M:%S"` - This is sample application 2!' > /app2/test.sh && chmod +x /app2/test.sh

# # register cron jobs to start the applications and redirects their stdout/stderr
# # to the stdout/stderr of the entry process by adding lines to /etc/crontab
# RUN echo "*/1 * * * * root /app1/test.sh > /app/test.log" >> /etc/crontab
# RUN echo "*/2 * * * * root /app2/test.sh > /app/test.log" >> /etc/crontab


# CMD cron -f
# RUN service cron restart
 # /etc/cron.hourly
# Run the command on container startup
# CMD cron && tail -f /var/log/cron.log
# CMD cron -f
# RUN ls /etc/cron.d
COPY .env /app/.env
EXPOSE 7528
CMD [ "pm2-runtime", "ecosystem.config.js" ]
# RUN pm2 startup 
# RUN pm2 save
# start cron in foreground (don't fork)
# ENTRYPOINT [ "cron", "-f" ]
