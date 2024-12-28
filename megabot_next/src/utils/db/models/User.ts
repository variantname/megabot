import mongoose from 'mongoose';

// Очищаем кэш модели
if (mongoose.models.User) {
	delete mongoose.models.User;
}

const userSchema = new mongoose.Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
		},
		password: {
			type: String,
			required: true,
		},
		user_type: {
			type: String,
			default: 'USER_FREE',
		},
		sellers: [
			{
				seller_name: {
					type: String,
					required: true,
				},
				seller_id: {
					type: String,
					required: true,
				},
				created_at: {
					type: Date,
					default: Date.now,
				},
			},
		],
		created_at: {
			type: Date,
			default: Date.now,
		},
		active: {
			type: Boolean,
			default: false,
		},
		validated: {
			type: Boolean,
			default: false,
		},
		active_till: {
			type: Date,
		},
		last_login: {
			type: Date,
		},
		// Новые поля для уведомлений
		telegram_id: {
			type: String,
		},
		notification_settings: {
			type: Object,
			default: {},
		},
		notification_enabled: {
			type: Boolean,
			default: true,
		},
		total_supplies_booked: {
			type: Number,
			default: 0,
		},
		ip_history: [
			{
				ip: String,
				date: { type: Date },
				user_agent: String,
			},
		],
		// История платежей
		payment_history: [
			{
				amount: Number,
				date: { type: Date },
				status: {
					type: String,
				},
				payment_method: String,
				transaction_id: String,
			},
		],
		supplies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Supply' }],
	},
	{
		timestamps: true,
		strict: true,
		minimize: false,
		collection: 'users',
	}
);

userSchema.pre('save', function (next) {
	console.log('Pre-save hook. Document:', this.toObject());
	next();
});

userSchema.post('save', function (doc) {
	console.log('Post-save hook. Saved document:', doc.toObject());
});

const User = mongoose.model('User', userSchema);

console.log('Model fields:', Object.keys(User.schema.paths));

export default User;
