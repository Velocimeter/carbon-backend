import * as dotenv from 'dotenv';

// Print NODE_ENV
console.log('NODE_ENV:', process.env.NODE_ENV);

// Try loading .env manually
console.log('Loading .env file manually...');
const result = dotenv.config();
console.log('Dotenv config result:', result);

// Print DATABASE_URL before and after
console.log('DATABASE_URL before:', process.env.DATABASE_URL?.substring(0, 30) + '...');
console.log('DATABASE_URL after dotenv.config():', process.env.DATABASE_URL?.substring(0, 30) + '...');

// Print all environment variables starting with DATABASE
console.log('\nAll DATABASE environment variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('DATABASE'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });

// Print first few characters of .env content if it exists
try {
  const fs = require('fs');
  if (fs.existsSync('.env')) {
    const content = fs.readFileSync('.env', 'utf8');
    console.log('\nFirst line of .env file:', content.split('\n')[0]);
    console.log('Total lines in .env file:', content.split('\n').length);
  } else {
    console.log('\n.env file does not exist');
  }
} catch (err) {
  console.error('Error reading .env file:', err);
} 