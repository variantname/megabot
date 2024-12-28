import mongoose from 'mongoose';

const supplySchema = new mongoose.Schema({
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
	created_at: {
		type: Date,
		default: Date.now,
	},
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
});

export default mongoose.models.Supply || mongoose.model('Supply', supplySchema);
