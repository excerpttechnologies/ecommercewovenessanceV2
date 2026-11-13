/**
 * Script to check image data for a specific barcode
 */

/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS diagnostic script, not app code */
require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

async function checkBarcode(barcode) {
  const uri = process.env.ERP_MONGO_URI || process.env.ERP_MONGODB_URI || process.env.MONGODB_URI;
  const dbName = process.env.ERP_DB_NAME || 'grooretailerp1';

  if (!uri) {
    console.error('MongoDB URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const collection = db.collection('barcodeLabel');

    const doc = await collection.findOne(
      { barcodeNo: barcode },
      { projection: { barcodeNo: 1, image: 1, imageUrl: 1, filePath: 1, itemName: 1, description: 1 } }
    );

    if (!doc) {
      console.log(`\n❌ Barcode "${barcode}" not found in database`);
    } else {
      console.log(`\n✓ Found barcode "${barcode}":`);
      console.log('----------------------------------------');
      console.log('barcodeNo:', doc.barcodeNo);
      console.log('itemName:', doc.itemName || 'N/A');
      console.log('description:', doc.description || 'N/A');
      console.log('----------------------------------------');
      console.log('image field:', doc.image || 'N/A');
      console.log('imageUrl field:', doc.imageUrl || 'N/A');
      console.log('filePath field:', doc.filePath || 'N/A');
      console.log('----------------------------------------');

      // Test image resolution
      const erpBase = process.env.ERP_IMAGE_BASE;
      console.log('\nImage Resolution Test:');
      console.log('ERP_IMAGE_BASE:', erpBase || 'NOT SET');

      if (doc.image) {
        const resolved = doc.image.startsWith('http')
          ? doc.image
          : erpBase
            ? `${erpBase.replace(/\/+$/, '')}${doc.image.startsWith('/') ? doc.image : '/' + doc.image}`
            : doc.image;
        console.log(`Resolved image URL: ${resolved}`);
      }

      if (doc.imageUrl) {
        const resolved = doc.imageUrl.startsWith('http')
          ? doc.imageUrl
          : erpBase
            ? `${erpBase.replace(/\/+$/, '')}${doc.imageUrl.startsWith('/') ? doc.imageUrl : '/' + doc.imageUrl}`
            : doc.imageUrl;
        console.log(`Resolved imageUrl URL: ${resolved}`);
      }

      // Fallback barcode image
      const barcodeImage = `https://erp.wovenessence.in/august_8A_images/${encodeURIComponent(barcode)}.jpg`;
      console.log(`Fallback barcode image: ${barcodeImage}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

const barcode = process.argv[2] || '4A1159';
console.log(`Checking barcode: ${barcode}`);
checkBarcode(barcode);
