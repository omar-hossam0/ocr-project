#!/usr/bin/env node
/**
 * Quick MongoDB Connection Test
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load backend .env
dotenv.config({ path: join(__dirname, 'backend', '.env') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

console.log('🔍 Testing MongoDB Connection...\n');
console.log('URI:', uri ? uri.replace(/:[^:@]+@/, ':****@') : 'NOT SET');
console.log('DB:', dbName || 'NOT SET');
console.log('');

if (!uri) {
  console.error('❌ MONGODB_URI not found in backend/.env');
  process.exit(1);
}

async function testConnection() {
  let client;
  
  try {
    console.log('⏳ Connecting...');
    
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    await client.connect();
    
    console.log('✅ Connected successfully!\n');
    
    // Test database access
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    console.log('📊 Database Info:');
    console.log('   Name:', db.databaseName);
    console.log('   Collections:', collections.length);
    
    if (collections.length > 0) {
      console.log('   Available collections:');
      collections.forEach(col => {
        console.log(`     - ${col.name}`);
      });
    }
    
    console.log('\n✅ MongoDB is ready to use!');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Check username and password in MONGODB_URI');
      console.error('   2. Verify user exists in MongoDB Atlas (Database Access)');
      console.error('   3. Check user has correct permissions');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Check Network Access in MongoDB Atlas');
      console.error('   2. Add your IP address or use 0.0.0.0/0 (allow all)');
      console.error('   3. Check internet connection');
    } else {
      console.error('\n💡 Check:');
      console.error('   1. MONGODB_URI format in backend/.env');
      console.error('   2. MongoDB Atlas cluster is running');
      console.error('   3. Connection string is correct');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testConnection();
