import mongoose from 'mongoose';

// Очищаем кэш модели
if (mongoose.models.User) {
	delete mongoose.models.User;
}

// Схема поставки
const supplySchema = new mongoose.Schema(
	{
		task_id: {
			type: String,
			required: true,
		},
		preorder_id: {
			type: String,
			required: true,
		},
		warehouse_name: String,
		warehouse_id: String,
		booking_settings: {
			mode: {
				type: String,
				default: null,
			},
			target_dates: [String],
			priority: {
				type: String,
				default: null,
			},
			target_coeff: String,
		},
		status: {
			active: {
				type: Boolean,
				default: false,
			},
			attempts_count: {
				type: Number,
				default: 0,
			},
			booked: {
				type: Boolean,
				default: false,
			},
			supply_id: {
				type: String,
				default: null,
			},
		},
	},
	{ timestamps: true }
);

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
				supplies: [supplySchema],
			},
		],
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
		payment_history: [
			{
				amount: Number,
				date: { type: Date },
				status: String,
				payment_method: String,
				transaction_id: String,
			},
		],
	},
	{
		timestamps: true,
		strict: true,
		minimize: false,
		collection: 'users',
	}
);

userSchema.index({ 'sellers.seller_id': 1 });
userSchema.index({ 'sellers.supplies._id': 1 });

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
