const mongoose = require('mongoose');
const User = require('./models/user');

/**
 * Script to create database indexes for optimal KYC filtering performance
 * Run this script once to set up the necessary indexes
 */

async function createKycIndexes() {
  try {
    console.log('🔧 Setting up KYC filtering indexes...');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shortlet360');
      console.log('📡 Connected to MongoDB');
    }

    // Create indexes for KYC status fields
    console.log('📊 Creating KYC status indexes...');
    
    await User.collection.createIndex({ "kyc.tier1.status": 1 });
    console.log('✅ Created index on kyc.tier1.status');
    
    await User.collection.createIndex({ "kyc.tier2.status": 1 });
    console.log('✅ Created index on kyc.tier2.status');
    
    await User.collection.createIndex({ "kyc.tier3.status": 1 });
    console.log('✅ Created index on kyc.tier3.status');

    // Create compound indexes for common filter combinations
    console.log('📊 Creating compound indexes...');
    
    await User.collection.createIndex({ 
      "kyc.tier1.status": 1, 
      "createdAt": -1 
    });
    console.log('✅ Created compound index on tier1 status + createdAt');
    
    await User.collection.createIndex({ 
      "kyc.tier2.status": 1, 
      "createdAt": -1 
    });
    console.log('✅ Created compound index on tier2 status + createdAt');
    
    await User.collection.createIndex({ 
      "kyc.tier3.status": 1, 
      "createdAt": -1 
    });
    console.log('✅ Created compound index on tier3 status + createdAt');

    // Create text index for search functionality
    console.log('📊 Creating text search indexes...');
    
    await User.collection.createIndex({
      first_name: "text",
      last_name: "text",
      email: "text",
      short_id: "text",
      phone_number: "text"
    });
    console.log('✅ Created text index for search fields');

    // Create individual indexes for search fields (for exact matches)
    await User.collection.createIndex({ email: 1 });
    console.log('✅ Created index on email');
    
    await User.collection.createIndex({ short_id: 1 });
    console.log('✅ Created index on short_id');
    
    await User.collection.createIndex({ phone_number: 1 });
    console.log('✅ Created index on phone_number');

    // Create indexes for KYC existence checks
    console.log('📊 Creating KYC existence indexes...');
    
    await User.collection.createIndex({ "kyc.tier1": 1 });
    console.log('✅ Created index on kyc.tier1 existence');
    
    await User.collection.createIndex({ "kyc.tier2": 1 });
    console.log('✅ Created index on kyc.tier2 existence');
    
    await User.collection.createIndex({ "kyc.tier3": 1 });
    console.log('✅ Created index on kyc.tier3 existence');

    // List all indexes to verify
    console.log('\n📋 Current indexes on User collection:');
    const indexes = await User.collection.listIndexes().toArray();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n🎉 All KYC indexes created successfully!');
    console.log('💡 These indexes will significantly improve KYC filtering performance.');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    // Close connection if we opened it
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📡 Disconnected from MongoDB');
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  createKycIndexes().catch(console.error);
}

module.exports = { createKycIndexes };
