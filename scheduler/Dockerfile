FROM alpine:3.20
RUN apk add --no-cache curl
COPY scheduler.sh /usr/local/bin/scheduler.sh
# Strip Windows line endings in case git checked the file out as CRLF.
RUN sed -i 's/\r$//' /usr/local/bin/scheduler.sh
CMD ["sh", "/usr/local/bin/scheduler.sh"]
