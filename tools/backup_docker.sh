#!/bin/bash
#
# Dumps jschan database from docker to a gzip archive, and tarballs the static folder.
# Takes the desired output dir as an argument, otherwise outputs to working dir.
# Must be run from the root of the git repository (the base jschan folder).
# If running via cronjob, copy me somewhere safe and root-only, like /usr/local/sbin!
#

#change as you like
APP_NAME="marzichan"

#get docker envars
JSCHAN_DIR="."
source "$JSCHAN_DIR/docker/secrets.env"

#set some various vars
MONGO_DATABASE="jschan"
TIMESTAMP=`date +%F-%H%M`
BACKUPS_DIR="."
HOST_BACKUPS_DIR="${1:-.}"

DB_BACKUP_NAME="$APP_NAME-$TIMESTAMP.gz"
FILE_BACKUP_NAME="$APP_NAME-$TIMESTAMP-files.tar.gz"
DB_ARCHIVE_PATH="$BACKUPS_DIR/$DB_BACKUP_NAME"
HOST_DB_ARCHIVE_PATH="$HOST_BACKUPS_DIR/$DB_BACKUP_NAME"
HOST_FILE_ARCHIVE_PATH="$HOST_BACKUPS_DIR/$FILE_BACKUP_NAME"

#create backup folder
mkdir -p $HOST_BACKUPS_DIR

#archive and compress files
tar -czf $HOST_FILE_ARCHIVE_PATH "$JSCHAN_DIR/docker/static"

#dump database to .gz archive
sudo docker compose exec -t mongodb mongodump --username $MONGO_USERNAME --password $MONGO_PASSWORD --authenticationDatabase admin --db $MONGO_DATABASE --archive=$DB_ARCHIVE_PATH --gzip \
&& rm -rf dump
sudo docker compose cp mongodb:$DB_ARCHIVE_PATH $HOST_DB_ARCHIVE_PATH
sudo docker compose exec -t mongodb rm -f $DB_ARCHIVE_PATH

#delete backups older than 30 days
sudo find $HOST_BACKUPS_DIR -type f -name "*.gz" -mtime +30 -exec rm -f {} \;
