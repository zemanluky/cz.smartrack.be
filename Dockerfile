# first stage - build
# start with bun
FROM oven/bun:1.2-debian AS build

# work from the volume directory
WORKDIR /app
COPY bun.lock .
COPY package.json .

# install packages
RUN bun install --frozen-lockfile

# copy the rest of the source code
COPY . /app

# compile everything to a binary called cli which includes the bun runtime
ENV NODE_ENV=production
RUN bun build --compile ./src/index.ts --outfile server

# second stage - run
# start with a clean ubuntu image
FROM ubuntu:24.04
WORKDIR /app

# copy the compiled binary from the build image
COPY --from=build /app/server /app/server

# add unprivileged user
RUN groupadd -g 1869 bun
RUN useradd -m -g 1869 -u 1869 bun

# enable the unprivileged user to run the binary
RUN chown bun:bun /app/server

# switch to the unprivileged user
USER bun

# execute the binary as the express server
SHELL ["/bin/bash", "-c"]
CMD ./server