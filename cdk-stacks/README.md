# AWS CDK stacks with all the backend and frontend resources

## Useful commands

 * `npm run install:all`                 install all necessary modules
 * `npm run build`                       compile typescript to js
 * `npm run configure`                   start the configuration script
 * `npm run sync-config`                 download frontend-config.js for local frontend testing
 * `npm run build:frontend`              build frontend applications
 * `npm run cdk:deploy`                  deploy backend and frontend stacks to your default AWS account/region
 * `npm run cdk:deploy:gitbash`          deploy backend and frontend stacks to your default AWS account/region (WINDOWS)
 * `npm run build:deploy:all`            build frontend applications and deploy stacks to your default AWS account/region
 * `npm run build:deploy:all:gitbash`    build frontend applications and deploy stacks to your default AWS account/region (WINDOWS) 

 ## What's different about the gitbash (windows) specific commands
 Building on Windows requires a few small changes that have been bundled into different gitbash specific scripts:
 * Use of `set` to configure the `NODE_ENV` environment variable - [More Information](https://stackoverflow.com/a/9250168)
 * All `cdk` commands are prefixed with `winpty` - [More Information](https://github.com/git-for-windows/git/wiki/FAQ#some-native-console-programs-dont-work-when-run-from-git-bash-how-to-fix-it)

## Running the front end locally against your deployed services
If you want to run locally against your deployed API Gateway and AWS Lambda code you will need to complete the following steps:
- Ensure you have fully deployed your back-end code
- Ensure that you have set the region in your config to the region of the back-end you want to test
  - Run `aws configure` to check or change the region
- Run `npm run sync-config`. This will sync down your SSM params into a file called `frontend-config.js`
- Ensure that localhost is included in your Allowed Origins for your API Gateway
(see Step 7 in the main [README](../README.md),  you can reference your cloudfront url as well as localhost by separating them with a comma for the `webapp-api-allowed-origins` param)
- In your command line navigate to the `webapp` folder and run `npm run start` 
- This will launch the front end at https://localhost:3001/

IMPORTANT:
- **DO NOT point localhost at your Production environment**. The above steps are to allow local development against a non-Prod environment.
- **DO NOT put `frontend-config.js` into your source control.** It is listed in the gitignore file, so will be ignored by default in the standard project configuration.


