FROM alpine:latest

RUN apk --no-cache add nodejs npm && \
  npm install --global --production assets-proxy && \
  mkdir -p /root/files

WORKDIR /root

ONBUILD COPY .assetsproxyrc.js .

CMD ["assets-proxy"]
