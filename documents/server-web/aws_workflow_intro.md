# Structure of server website's workflow

This file is used to introduce the structure of server's workflow.

## The role of CI

This CI should finish several jobs :
1. `npm ci`
2. `npm run tyep-check-tests`
3. create service container to run PostgreSQL temporarily and run flyway migration
4. `npm run test`
5. `npm run build`

## The role of CD

This CD should finish several jobs:
1. build docker image with a tag
2. run the shell in EC2
3. use docker compose pull the image
4. use docker compose run flyway
5. rebuild container and make a health check
6. if it fails, we will go back to the last successful version

## The changing based on CI/CD

### Before CI/CD :

Need use below command:
```
ssh

git pull

docker compose
```

to updates our code on server

###  After CI/CD :

There is ghcr which contains the image on github.
Image will be built by docker-compose file and move into ghcr.
Then, it will be moved into server if CI passes.


