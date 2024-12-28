import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;

// Добавляем основные слушатели событий
mongoose.connection.once('connected', () => {
	console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
	console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
	console.log('Mongoose disconnected from MongoDB');
	cachedConnection = null;
});

async function dbConnect(): Promise<typeof mongoose> {
	if (cachedConnection) {
		return cachedConnection;
	}

	if (!process.env.MONGODB_URI) {
		throw new Error('Please add your MONGODB_URI to .env file');
	}

	try {
		const connection = await mongoose.connect(process.env.MONGODB_URI);
		cachedConnection = connection;
		return connection;
	} catch (error) {
		console.error('Error connecting to MongoDB', error);
		throw error;
	}
}

export default dbConnect;
