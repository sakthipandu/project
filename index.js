const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer'); 
const pgp = require('pg-promise');
const dataRouter = require('./project/router');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(dataRouter);
app.use(bodyParser.json());


app.get('/', (request, response) => {
  response.json({ message: 'Hello World' });
  console.log({ message: 'Hello World' });
});


app.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
});
