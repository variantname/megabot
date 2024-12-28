import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/utils/db/db';
import User from '@/utils/db/models/User';

export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
		}

		await dbConnect();

		const user = await User.findOne({ email: session.user.email })
			.select('-password -payment_history -ip_history') // Исключаем чувствительные данные
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
				sellers: user.sellers,
				validated: user.validated,
				user_type: user.user_type,
				notification_enabled: user.notification_enabled,
				notification_settings: user.notification_settings,
				total_supplies_booked: user.total_supplies_booked,
				active: user.active,
				active_till: user.active_till,
			},
			setup_completed: user.sellers?.length > 0,
		});
	} catch (error) {
		console.error('Error fetching user:', error);
		return NextResponse.json(
			{ error: 'Ошибка получения данных' },
			{ status: 500 }
		);
	}
}
