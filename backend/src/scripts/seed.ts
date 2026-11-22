import 'dotenv/config';
import mongoose from 'mongoose';
import {
  getMongoConnectOptions,
  isConfiguredMongoUri,
  sanitizeConnectionError,
} from '../config/mongo-uri';
import { MongoLibraryRepository } from '../repositories/library';

async function runSeed(): Promise<void> {
  const reset = process.argv.includes('--reset');
  const mongoUri = process.env.MONGODB_URI?.trim();

  if (!isConfiguredMongoUri(mongoUri)) {
    console.error(
      'MONGODB_URI is not configured. Set MONGODB_URI in .env or your environment before running the seed script.'
    );
    process.exit(1);
  }

  try {
    const options = getMongoConnectOptions(mongoUri, process.env.MONGODB_DB_NAME);
    await mongoose.connect(mongoUri, options);
    console.log(`Connected to MongoDB (db: ${mongoose.connection.name}).`);

    const repository = new MongoLibraryRepository();
    const result = await repository.seedInitialData({ reset });
    const [books, lendings] = await Promise.all([
      repository.findBooks({}),
      repository.findLendings(),
    ]);

    console.log(
      `MongoDB seed complete: ${result.booksInserted} books inserted, ${result.lendingsInserted} lending records inserted (total in DB: ${books.length} books, ${lendings.length} lendings).`
    );
  } catch (error) {
    console.error('MongoDB seed failed:', sanitizeConnectionError(error));
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runSeed();
