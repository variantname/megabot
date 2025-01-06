import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/utils/db/db';
import User from '@/utils/db/models/User';

// Получение данных пользователя
export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
		}

		await dbConnect();
		const user = await User.findById(session.user.id)
			.select('-password -payment_history -ip_history -sellers')
			.lean();

		if (!user) {
			return NextResponse.json(
				{ error: 'Пользователь не найден' },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			user: {
				email: user.email,
				validated: user.validated,
				user_type: user.user_type,
				notification_enabled: user.notification_enabled,
				notification_settings: user.notification_settings,
				total_supplies_booked: user.total_supplies_booked,
				active: user.active,
				active_till: user.active_till,
			},
		});
	} catch (error) {
		console.error('Error fetching user:', error);
		return NextResponse.json(
			{ error: 'Ошибка получения данных' },
			{ status: 500 }
		);
	}
}

// Обновление данных пользователя
export async function PUT(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
		}

		await dbConnect();
		const updateData = await req.json();

		// Убираем поля, которые нельзя обновлять через этот эндпоинт
		const {
			sellers,
			password,
			payment_history,
			ip_history,
			...allowedUpdates
		} = updateData;

		const user = await User.findByIdAndUpdate(
			session.user.id,
			{
				$set: {
					...allowedUpdates,
					last_update: new Date(),
				},
			},
			{ new: true }
		).select('-password -payment_history -ip_history -sellers');

		if (!user) {
			return NextResponse.json(
				{ error: 'Пользователь не найден' },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			message: 'Данные успешно обновлены',
			user: {
				email: user.email,
				validated: user.validated,
				user_type: user.user_type,
				notification_enabled: user.notification_enabled,
				notification_settings: user.notification_settings,
				total_supplies_booked: user.total_supplies_booked,
				active: user.active,
				active_till: user.active_till,
			},
		});
	} catch (error) {
		console.error('User update error:', error);
		return NextResponse.json(
			{ error: 'Ошибка при обновлении данных' },
			{ status: 500 }
		);
	}
}
