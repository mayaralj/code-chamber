FROM alpine:3.19

RUN apk add --no-cache g++ curl && \
    mkdir -p /usr/include/nlohmann && \
    curl -L https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp \
      -o /usr/include/nlohmann/json.hpp