const pool = require('../dp');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const { Sequelize } = require('sequelize');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');


const createDatabase = async (request, response) => {
    const { name, email_id, phone_no, password } = request.body;
    let clientDatabase;

    const Verification_code = Math.floor(100000 + Math.random() * 900000);

    try {
        await pool.connect();

        await pool.query(`CREATE DATABASE ${name}`);

        clientDatabase = new Pool({
            user: 'postgres',
            password: 'sa2547',
            port: 5432,
            host: 'localhost',
            database: name,
        });
        await clientDatabase.connect();
        const createTableQuery = `CREATE TABLE IF NOT EXISTS "user" (id serial primary key, name varchar(250) null, email_id varchar(250) null, phone_no BIGINT null, password varchar(250) null,  Verification_code INTEGER)`;

        await clientDatabase.query(createTableQuery);

        await clientDatabase.query('INSERT INTO "user" (name, email_id, phone_no, password,  Verification_code) VALUES ($1, $2, $3, $4, $5)',
            [name, email_id, phone_no, password,  Verification_code]);

        await sendOTPEmail(email_id,  Verification_code, name, response);

async function sendOTPEmail(email, Verification_code, name, response) {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: 'sakthi032vel@gmail.com',
            pass: 'ttjzpkoyqhgdzond',
        },
    });

    const mailOptions = {
        from: 'sakthi032vel@gmail.com',
        to: email,
        subject: 'Your Email Verification',
        html: `<h1><font style="font-family: 'clarendon-fortune-bold'">Verify your email address</font></h1>
        <p><font color="black" size="3" style="font-family: 'arial'">Thanks for starting the new KaviWeb account creation process. We want to make sure it's really you. Please enter the following verification code when prompted. If you don’t want to create an account, you can ignore this message. </font></p>
        <p align="center"><font size="4" style="font-family: 'arial'"><strong>Verification code </strong></font><br> <font align="center" size="6" style="font-family: 'arial'"><strong>${Verification_code}</strong></font></p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        response.status(200).json({ message: 'OTP sent successfully via email' });
      } catch (error) {
        console.error('Error sending email:', error);
        response.status(500).json({ error: 'Internal server error' });
      }
    }

    } catch (error) {
        console.error('Error:', error);
        response.status(500).json({ error: 'Internal server error' });
    } finally {
        if (clientDatabase) {
            await clientDatabase.end();
        }
    }
};


  const verifyOTP = async (request, response) => {
    const { name,  Verification_code, } = request.body;
    let clientDatabase;
  
    try {
      await pool.connect();
  
      clientDatabase = new Pool({
        user: 'postgres',
        password: 'sa2547',
        port: 5432,
        host: 'localhost',
        database: name,
      });
  
      const result = await clientDatabase.query('SELECT * FROM "user"  WHERE  name = $1 AND  Verification_code = $2', [name,  Verification_code]);
  
      if (result.rows.length === 1) {
        response.status(200).json({ message: ' Verification code successfully' });
      }
      else {
        response.status(400).json({ error: 'Verification code' });
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


  const login = async (request, response) => {
    const { email_id, password } = request.body;
  
    try {
  
      const result = await pool.query('SELECT * FROM "user" WHERE email_id = $1', [email_id]);
  
      if (result.rows.length > 0) {
        const storedPassword = result.rows[0].password;
        const passwordMatch = bcrypt.compareSync(password, storedPassword);
  
        if (passwordMatch) {
          const newToken = jwt.sign({ employeeid: result.rows[0].employeeid }, jwtSecret);
          response.json({ success: true, message: 'Login successful', token: newToken });
        } else {
          response.status(401).json({ success: false, message: 'Invalid password' });
        }
        console.log({ employeeid: result.rows[0] });
      } else {
        response.status(401).json({ success: false, message: 'Invalid email_id' });
      }
    } catch (error) {
      console.error('Error executing query', error);
      response.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
  
    
  module.exports = {
    createDatabase,
    verifyOTP,
    getPdf,
    login
  };
  