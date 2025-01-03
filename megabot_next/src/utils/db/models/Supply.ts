import mongoose from 'mongoose';

// Очищаем кэш модели
if (mongoose.models.Supply) {
	delete mongoose.models.Supply;
}

const supplySchema = new mongoose.Schema(
	{
		user_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		task_id: {
			type: String,
			required: true,
		},
		seller_id: {
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
	{
		timestamps: true,
		strict: true,
		minimize: false,
		collection: 'supplies',
	}
);

// Хуки для отладки
supplySchema.pre('save', function (next) {
	console.log('Pre-save hook Supply:', this.toObject());
	next();
});

supplySchema.post('save', function (doc) {
	console.log('Post-save hook Supply:', doc.toObject());
});

const Supply = mongoose.model('Supply', supplySchema);

console.log('Supply Model fields:', Object.keys(Supply.schema.paths));

export default Supply;
