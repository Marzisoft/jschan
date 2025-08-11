FROM node:lts

RUN apt-get update -y
RUN apt-get install ffmpeg imagemagick graphicsmagick -y

WORKDIR /opt/jschan

COPY . .

RUN npm install

RUN npm install -g pm2 gulp

COPY ./docker/jschan/secrets.js ./configs/secrets.js

#i fucking hate docker
ENV MONGO_USERNAME jschan
ENV MONGO_PASSWORD changeme
ENV REDIS_PASSWORD changeme

CMD ["/bin/sh", "-c", "npx gulp generate-favicon; npx gulp; npx pm2-runtime start ecosystem.config.js"]
