import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/utils/db/db';
import User from '@/utils/db/models/User';

// Получение списка магазинов
export async function GET(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		await dbConnect();
		const user = await User.findById(session.user.id)
			.select('sellers')
			.lean();

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({ sellers: user.sellers || [] });
	} catch (error) {
		console.error('Get sellers error:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch sellers' },
			{ status: 500 }
		);
	}
}

// Добавление магазина
export async function POST(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const seller = await req.json();

		// Валидация магазина
		if (!seller.seller_name || !seller.seller_id) {
			return NextResponse.json(
				{ error: 'Название магазина и ИНН обязательны' },
				{ status: 400 }
			);
		}

		if (!/^\d{10}$|^\d{12}$/.test(seller.seller_id)) {
			return NextResponse.json(
				{ error: 'ИНН должен содержать 10 или 12 цифр' },
				{ status: 400 }
			);
		}

		// Проверка дубликатов
		const existingUser = await User.findOne({
			'sellers.seller_id': seller.seller_id,
			_id: { $ne: session.user.id },
		});

		if (existingUser) {
			return NextResponse.json(
				{ error: 'Этот ИНН уже используется другим пользователем' },
				{ status: 400 }
			);
		}

		await dbConnect();
		const user = await User.findByIdAndUpdate(
			session.user.id,
			{ $push: { sellers: seller } },
			{ new: true }
		).select('sellers');

		if (!user) {
			return NextResponse.json(
				{ error: 'Пользователь не найден' },
				{ status: 404 }
			);
		}

		// Возвращаем последний добавленный магазин
		const newSeller = user.sellers[user.sellers.length - 1];
		return NextResponse.json({ seller: newSeller });
	} catch (error) {
		console.error('Create seller error:', error);
		return NextResponse.json(
			{ error: 'Failed to create seller' },
			{ status: 500 }
		);
	}
}

// Обновление магазина
export async function PUT(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const originalSellerId = searchParams.get('id');
		if (!originalSellerId) {
			return NextResponse.json(
				{ error: 'Seller ID is required' },
				{ status: 400 }
			);
		}

		const updateData = await req.json();

		await dbConnect();
		const user = await User.findOneAndUpdate(
			{
				_id: session.user.id,
				'sellers.seller_id': originalSellerId,
			},
			{
				$set: {
					'sellers.$': {
						seller_id: updateData.seller_id,
						seller_name: updateData.seller_name,
					},
				},
			},
			{ new: true }
		).select('sellers');

		if (!user) {
			return NextResponse.json(
				{ error: 'Seller not found' },
				{ status: 404 }
			);
		}

		const updatedSeller = user.sellers.find(
			(s) => s.seller_id === updateData.seller_id
		);
		return NextResponse.json({ seller: updatedSeller });
	} catch (error) {
		console.error('Update seller error:', error);
		return NextResponse.json(
			{ error: 'Failed to update seller' },
			{ status: 500 }
		);
	}
}

// Удаление магазина
export async function DELETE(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const seller_id = searchParams.get('id');

		if (!seller_id) {
			return NextResponse.json(
				{ error: 'Seller ID is required' },
				{ status: 400 }
			);
		}

		await dbConnect();
		const user = await User.findByIdAndUpdate(
			session.user.id,
			{ $pull: { sellers: { seller_id: seller_id } } },
			{ new: true }
		).select('sellers');

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Delete seller error:', error);
		return NextResponse.json(
			{ error: 'Failed to delete seller' },
			{ status: 500 }
		);
	}
}
