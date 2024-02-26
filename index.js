const express = require('express');
const bodyParser = require('body-parser');
const dataRouter = require('./project/router');
require('dotenv').config();

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
