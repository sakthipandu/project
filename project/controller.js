const pool = require('../dp');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const jwtSecret = 'your_secret_key';
const nodemailer = require('nodemailer');
const { Sequelize } = require('sequelize');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');
const generator = require('generate-password'); 



const verifyToken = (req, res, next) => {
  try {

    const token = req.headers.authorization;

    if (!token || !token.startsWith('Bearer')) {
      return res.status(403).json({ success: false, message: 'No token provided' });
    }

    const tokenWithoutBearer = token.split(' ')[1];

    console.log('Received Token:', tokenWithoutBearer); // Log the received token

    jwt.verify(tokenWithoutBearer, jwtSecret, (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Failed to authenticate token' });
      }

      if (!decoded.name) {
        return res.status(401).json({ error: 'Unable to retrieve name from token' });
      }

      console.log('Decoded Token:', decoded);
      
      req.name = decoded.name;
      next();
    });
  } catch (error) {
    console.error('Error in verifyToken middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

//create database 
const createDatabase = async (request, response) => {
  const { name, email_id, phone_no } = request.body;
  let clientDatabase;

  const token = jwt.sign({ name }, jwtSecret, { expiresIn: '24h' });

  const verificationCode = Math.floor(100000 + Math.random() * 900000);
  
  const password = generator.generate({
    length: 10,
    numbers: true,
    uppercase: true,
    strict: true,
  });

  console.log(password);

  try {
  
    await pool.connect();

    const res = await pool.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${name}'`);

    if (res.rowCount === 0) {
      await pool.query(`CREATE DATABASE "${name}";`);
      console.log(`created database ${name}.`);
    } else {
      console.log(`${name} database already exists.`);
      response.status(400).json({ error: `${name} database already exists.` });
      return;
    }
    const saltRounds = 10;

    clientDatabase = new Pool({
      user: 'postgres',
      password: 'sa2547',
      port: 5432,
      host: 'localhost',
      database: name,
    });
    await clientDatabase.connect();
    const createTableQuery = `CREATE TABLE IF NOT EXISTS "user" (id serial primary key, name varchar(250) null,  email_id varchar(250) null, phone_no BIGINT null, password varchar(250), verification_code INTEGER, otp INTEGER)`;

    await clientDatabase.query(createTableQuery);

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await clientDatabase.query('INSERT INTO "user" (name, email_id, phone_no, password, verification_code) VALUES ($1, $2, $3, $4, $5)',
      [name, email_id, phone_no, hashedPassword, verificationCode]);

    await sendOTPEmail(email_id, password, verificationCode, name, response, token);
  } catch (error) {
    console.error('Error:', error);
    response.status(500).json({ error: 'Internal server error' });
  } finally {
    if (clientDatabase) {
      await clientDatabase.end();
    }
  }
};

async function sendOTPEmail(email, password, verificationCode, name, response, token) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL_EMAIL,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: 'sakthi032vel@gmail.com',
    to: email,
    subject: 'Your Email Verification',
    html: `<h1><font style="font-family: 'arial-bold'">Verify your email address</font></h1>
        <p><font color="black" size="3" style="font-family: 'arial'">HI ${name}.Your password. <strong>${password}</strong>..Thanks for starting the new KaviWeb account creation process. We want to make sure it's really you. Please enter the following verification code when prompted. If you don’t want to create an account, you can ignore this message. </font></p>
        <p align="center"><font size="4" style="font-family: 'arial'"><strong>Verification code </strong></font><br> <font align="center" size="6" style="font-family: 'arial'"><strong>${verificationCode}</strong></font></p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    response.status(200).json({ message: 'OTP sent successfully via email', token });
  } catch (error) {
    console.error('Error sending email:', error);
    response.status(500).json({ error: 'Internal server error' });
  }
};

//otp verfication
  const verifyOTP = async (request, response) => {
    const {Verification_code} = request.body;
    let clientDatabase;
  
    try {
      const {name} = request;

      if (!name) {
        return response.status(401).json({ error: 'Unable to retrieve employeeid or name from token' });
      }
  
      await pool.connect();
  
      clientDatabase = new Pool({
        user: 'postgres',
        password: 'sa2547',
        port: 5432, 
        host: 'localhost',
        database: name,
      });
  
      const result = await clientDatabase.query('SELECT * FROM "user"  WHERE  name = $1 AND  Verification_code = $2', [name, Verification_code]);
  
      if (result.rows.length === 0) {
        response.status(200).json({ message: ' Verification code successfully' });
        console.log({ message: ' Verification code successfully' })
      }
      else {
        response.status(400).json({ error: 'Verification code not match' });
        console.log({ message: ' Verification code not match' })
      }
    } 
    catch (error) {
      console.error('Error:', error);
      response.status(500).json({ error: 'Internal server error' });
    } 
    finally {
      if (clientDatabase) {
        await clientDatabase.end();
      }
    }
  };
  
  // pdf generater
  const getPdf = async (request, response) => {
    const name = request.params.name;
  
    const sequelize = new Sequelize({
      dialect: 'postgres',
      username: 'postgres',
      password: 'sa2547',
      port: 5432, 
      host: 'localhost',
      database: name,
    });
    const User = sequelize.define('user');
  
    try {
      await sequelize.authenticate();
      console.log('Connected to the database');
  
      await User.sync();
      await sequelize.sync({ force: false });
  
      const user = await sequelize.query('SELECT * FROM "user"', { type: Sequelize.QueryTypes.SELECT });
  
      const doc = new PDFDocument();
      doc.pipe(response);
  
      doc.fontSize(25).fillColor('blue').font('Helvetica-Bold').text('User Details', { align: 'center' });
      doc.moveDown();
  
      user.forEach((user) => {
        doc.fontSize(20).fillColor('black').text(`Name: ${user.name},\nEmail: ${user.email_id},\nPhoneNumber: ${user.phone_no}`);
        doc.moveDown();
        doc.addPage();
      });
      doc.end();
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error:', error);
      response.status(500).send('Internal Server Error');
    }
  };

  //clint login 
  const login = async (request, response) => {
    const { email_id, password } = request.body;
    let clientDatabase;
  
    try {
      const {name} = request;

      if (!name) {
        return response.status(401).json({ error: 'Unable to retrieve employeeid or name from token' });
      }
  
      await pool.connect();
  
      clientDatabase = new Pool({
        user: 'postgres',
        password: 'sa2547',
        port: 5432, 
        host: 'localhost',
        database: name,
      });

      const result = await clientDatabase.query('SELECT * FROM "user" WHERE email_id = $1', [email_id]);
  
      if (result.rows.length > 0) {
        const storedPassword = result.rows[0].password;
  
        const passwordMatch = await bcrypt.compare(password, storedPassword);
  
        if (passwordMatch) {
          response.json({ success: true, message: 'Login successful' });
          console.log({ success: true, message: 'Login successful' })
        } else {
          response.status(401).json({ success: false, message: 'Invalid  password' });
          console.log({ success: false, message: 'Invalid  password' })
        }
      } else {
        response.status(401).json({ success: false, message: 'Invalid username' });
        console.log({ success: false, message: 'Invalid username' })
      }
      
    } catch (error) {
      console.error('Error executing query', error);
      response.status(500).json({ success: false, message: 'Internal server error' });
    }finally {
      if (clientDatabase) {
        await clientDatabase.end();
      }
    }
  };

  //drob database
  const deleteDb = async (request, response) => {
    const name = request.params.name;

    const checkDatabaseQuery = 'SELECT datname FROM pg_catalog.pg_database WHERE datname = $1';
    const checkResult = await pool.query(checkDatabaseQuery, [name]);

    if (checkResult.rowCount === 0) {
        return response.status(404).json({ error: `Database '${name}' not found` });
    }

    await pool.query('SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE datname = $1', [name]);

    pool.query('DROP DATABASE ' + name, (error, results) => {
        if (error) {
            throw error;
        }
        response.status(200).send(`Database dropped: ${name}`);
    });
};

// create table
const createTable = async (request, response) => {
  const { tableName, columns, name, columnValues } = request.body;
  let clientDatabase;

  try {
    const pool = new Pool({
      user: 'postgres',
      password: 'sa2547',
      port: 5432,
      host: 'localhost',
      database: name, 
    });
    clientDatabase = await pool.connect();

    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
    console.log('SQL Query:', createTableQuery); 

    await clientDatabase.query(createTableQuery);

    if (columnValues && columnValues.length > 0) {
      const columnsList = Object.keys(columnValues[0]).join(', ');
      const valuesList = columnValues.map(valueObj =>
        Object.values(valueObj).map(val => `'${val}'`).join(', ')
      );

      const insertQuery = `INSERT INTO ${tableName} (${columnsList}) VALUES (${valuesList.join('), (')})`;
      console.log('SQL Insert Query:', insertQuery);
      await clientDatabase.query(insertQuery);
    }

    response.status(200).json({ message: 'Table created and data inserted successfully' });

  } catch (error) {
    console.error('Error:', error.message);
    response.status(500).json({ error: 'Internal server error' });
  } 
  finally {
    if (clientDatabase) {
      clientDatabase.release();
    }
  }
};

  module.exports = {
    createDatabase,
    verifyOTP,
    getPdf,
    login,
    deleteDb,
    createTable,
    verifyToken,
  };
  