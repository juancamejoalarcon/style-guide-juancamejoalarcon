<p align="center"> 
  <img src="https://juancamejoalarcon.s3.eu-west-3.amazonaws.com/logo-alternate-v2.svg" alt="Logo" width="480px">
</p>

<h1 align="center"> Style guide for <a href="https://www.juancamejoalarcon.com/">juancamejoalarcon.com</a> </h1>

This is a small style guide that I am using in my own personal page <a href="https://www.juancamejoalarcon.com/">juancamejoalarcon.com</a>. A demo of the project can be found here: [DEMO](https://juancamejoalarcon.github.io/style-guide-juancamejoalarcon/public/demo.html)

The project is built with [SVELTE](https://svelte.dev/) and [SASS](https://sass-lang.com/)

## Styles

The styles are compiled in a separate way and deploy to AWS. I am using AWS S3 as a cdn, and importing the styles to my own webpage.
```
@import url('https://juancamejoalarcon.s3.eu-west-3.amazonaws.com/juancamejoalarcon.css');
```
The SASS project can be found in `./stylesheets`
## Installation
### Project setup
```
npm install
```
### Local dev
This will launch two processes with [Concurrently](https://github.com/kimmobrunfeldt/concurrently): 
- Svelte
- SASS watcher.

```
npm run dev
```

### Deploy
`.github/workflows/deploy.yml` is in charge of the deployment of the SASS compiled file to AWS S3


