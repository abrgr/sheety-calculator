FROM node:8.9.4-alpine

RUN apk add --update git \
  && rm -rf /var/cache/apk/*
