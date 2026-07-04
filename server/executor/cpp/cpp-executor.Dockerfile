FROM alpine:3.19

RUN apk add --no-cache g++ curl lld binutils && \
    mkdir -p /usr/include/nlohmann && \
    curl -L https://raw.githubusercontent.com/nlohmann/json/develop/single_include/nlohmann/json.hpp \
      -o /usr/include/nlohmann/json.hpp

RUN g++ -std=c++17 -x c++-header /usr/include/nlohmann/json.hpp \
  -o /usr/include/nlohmann/json.hpp.gch

COPY server/executor/cpp/wrapper.hpp /usr/include/wrapper.hpp
RUN g++ -std=c++17 -x c++-header /usr/include/wrapper.hpp -o /usr/include/wrapper.hpp.gch