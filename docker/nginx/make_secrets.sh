#!/usr/bin/bash
source /opt/jschan/secrets.env
echo "$NGINX_PASSWORDS" > /etc/nginx/passwords
