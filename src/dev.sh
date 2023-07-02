#!/bin/sh
NODE_ENV=development node esbuild.js &
sleep 2 && NODE_ENV=development nodemon -r dotenv/config out/dev.cjs dotenv_config_path=.env.development.local
