import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/utils/db/db';
import User from '@/utils/db/models/User';

// Получение списка поставок для конкретного магазина
export async function GET(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const sellerId = searchParams.get('seller_id');

		if (!sellerId) {
			return NextResponse.json(
				{ error: 'Seller ID is required' },
				{ status: 400 }
			);
		}

		await dbConnect();
		const user = await User.findOne(
			{
				_id: session.user.id,
				'sellers.seller_id': sellerId,
			},
			{
				'sellers.$': 1,
			}
		).lean();

		if (!user || !user.sellers[0]) {
			return NextResponse.json(
				{ error: 'Seller not found' },
				{ status: 404 }
			);
		}

		// Добавляем информацию о магазине к каждой поставке
		const supplies = (user.sellers[0].supplies || []).map((supply) => ({
			...supply,
			_id: supply._id.toString(),
			seller_id: user.sellers[0].seller_id,
			seller_name: user.sellers[0].seller_name,
		}));

		return NextResponse.json({ supplies });
	} catch (error) {
		console.error('Get supplies error:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch supplies' },
			{ status: 500 }
		);
	}
}

// Создание поставки для конкретного магазина
export async function POST(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const sellerId = searchParams.get('seller_id');

		if (!sellerId) {
			return NextResponse.json(
				{ error: 'Seller ID is required' },
				{ status: 400 }
			);
		}

		const data = await req.json();

		await dbConnect();
		const mongoose = require('mongoose');
		const newSupplyId = new mongoose.Types.ObjectId();

		const user = await User.findOneAndUpdate(
			{
				_id: session.user.id,
				'sellers.seller_id': sellerId,
			},
			{
				$push: {
					'sellers.$.supplies': {
						_id: newSupplyId,
						...data,
						status: {
							active: false,
							attempts_count: 0,
							booked: false,
							supply_id: null,
						},
					},
				},
			},
			{ new: true }
		);

		if (!user) {
			return NextResponse.json(
				{ error: 'Seller not found' },
				{ status: 404 }
			);
		}

		const seller = user.sellers.find((s) => s.seller_id === sellerId);

		if (!seller) {
			return NextResponse.json(
				{ error: 'Seller not found after update' },
				{ status: 404 }
			);
		}

		const newSupply = seller.supplies[seller.supplies.length - 1];

		// Добавляем информацию о магазине и _id
		const supplyWithSeller = {
			...newSupply.toObject(),
			_id: newSupply._id.toString(),
			seller_id: seller.seller_id,
			seller_name: seller.seller_name,
		};

		return NextResponse.json({ supply: supplyWithSeller });
	} catch (error: any) {
		console.error('Create supply error:', error);
		return NextResponse.json(
			{
				error: `Failed to create supply: ${
					error?.message || 'Unknown error'
				}`,
			},
			{ status: 500 }
		);
	}
}

// Обновление поставки
export async function PUT(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const supplyId = searchParams.get('id');
		const sellerId = searchParams.get('seller_id');

		if (!supplyId || !sellerId) {
			return NextResponse.json(
				{ error: 'Supply ID and Seller ID are required' },
				{ status: 400 }
			);
		}

		const updateData = await req.json();
		const updateFields: Record<string, any> = {};

		if (updateData.preorder_id !== undefined) {
			updateFields['sellers.$.supplies.$[supply].preorder_id'] =
				updateData.preorder_id;
		}
		if (updateData.status !== undefined) {
			updateFields['sellers.$.supplies.$[supply].status'] =
				updateData.status;
		}
		if (updateData.booking_settings !== undefined) {
			updateFields['sellers.$.supplies.$[supply].booking_settings'] =
				updateData.booking_settings;
		}

		await dbConnect();

		// Обновляем поставку
		await User.findOneAndUpdate(
			{
				_id: session.user.id,
				'sellers.seller_id': sellerId,
			},
			{ $set: updateFields },
			{
				arrayFilters: [{ 'supply._id': supplyId }],
			}
		);

		// Получаем обновленную поставку
		const user = await User.findOne(
			{
				_id: session.user.id,
				'sellers.seller_id': sellerId,
				'sellers.supplies._id': supplyId,
			},
			{
				'sellers.$': 1,
			}
		);

		if (!user || !user.sellers[0]) {
			return NextResponse.json(
				{ error: 'Supply not found' },
				{ status: 404 }
			);
		}

		const updatedSupply = user.sellers[0].supplies.find(
			(s) => s._id.toString() === supplyId
		);

		if (!updatedSupply) {
			return NextResponse.json(
				{ error: 'Supply not found after update' },
				{ status: 404 }
			);
		}

		// Добавляем информацию о магазине к обновленной поставке
		const supplyWithSeller = {
			...updatedSupply.toObject(),
			_id: updatedSupply._id.toString(),
			seller_id: user.sellers[0].seller_id,
			seller_name: user.sellers[0].seller_name,
		};

		return NextResponse.json({ supply: supplyWithSeller });
	} catch (error: any) {
		console.error('Update supply error:', error);
		return NextResponse.json(
			{
				error: `Failed to update supply: ${
					error?.message || 'Unknown error'
				}`,
			},
			{ status: 500 }
		);
	}
}

// Удаление поставки
export async function DELETE(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const supplyId = searchParams.get('id');
		const sellerId = searchParams.get('seller_id');

		if (!supplyId || !sellerId) {
			return NextResponse.json(
				{ error: 'Supply ID and Seller ID are required' },
				{ status: 400 }
			);
		}

		await dbConnect();
		const user = await User.findOneAndUpdate(
			{
				_id: session.user.id,
				'sellers.seller_id': sellerId,
			},
			{
				$pull: {
					'sellers.$.supplies': { _id: supplyId },
				},
			},
			{ new: true }
		);

		if (!user) {
			return NextResponse.json(
				{ error: 'Supply not found' },
				{ status: 404 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('Delete supply error:', error);
		return NextResponse.json(
			{
				error: `Failed to delete supply: ${
					error?.message || 'Unknown error'
				}`,
			},
			{ status: 500 }
		);
	}
}
