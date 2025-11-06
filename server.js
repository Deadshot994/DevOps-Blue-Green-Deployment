// server.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const version = process.env.APP_VERSION || "v1";

app.get('/', (req, res) => {
  res.send(`<h1>Welcome to the ${version} of Blue-Green Node App!</h1>`);
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', version });
});

app.listen(port, () => {
  console.log(`App running on port ${port}, version ${version}`);
});
