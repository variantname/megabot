import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/utils/db/db';
import User from '@/utils/db/models/User';

export async function POST(req: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
		}

		await dbConnect();
		const { sellers, ...otherFields } = await req.json();

		// Валидация поставщиков
		if (sellers && Array.isArray(sellers)) {
			for (const seller of sellers) {
				// Проверка наличия обязательных полей
				if (!seller.seller_name || !seller.seller_id) {
					return NextResponse.json(
						{ error: 'Название магазина и ИНН обязательны' },
						{ status: 400 }
					);
				}

				// Валидация ИНН
				if (!/^\d{10}$|^\d{12}$/.test(seller.seller_id)) {
					return NextResponse.json(
						{ error: 'ИНН должен содержать 10 или 12 цифр' },
						{ status: 400 }
					);
				}

				// Проверка названия магазина
				if (seller.seller_name.length < 3) {
					return NextResponse.json(
						{
							error: 'Название магазина должно содержать минимум 3 символа',
						},
						{ status: 400 }
					);
				}

				// Проверяем, не используется ли этот ИНН другим пользователем
				const existingUser = await User.findOne({
					'sellers.seller_id': seller.seller_id,
					email: { $ne: session.user.email },
				});

				if (existingUser) {
					return NextResponse.json(
						{ error: 'Этот ИНН уже используется другим пользователем' },
						{ status: 400 }
					);
				}
			}
		}

		// Обновляем пользователя
		const user = await User.findOneAndUpdate(
			{ email: session.user.email },
			{
				$set: {
					sellers,
					...otherFields,
					last_update: new Date(),
				},
			},
			{ new: true }
		).select('-password -payment_history -ip_history');

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
				sellers: user.sellers,
				user_type: user.user_type,
				notification_enabled: user.notification_enabled,
				notification_settings: user.notification_settings,
			},
			setup_completed: user.sellers?.length > 0,
		});
	} catch (error: any) {
		console.error('User update error:', error);
		return NextResponse.json(
			{ error: 'Ошибка при обновлении данных' },
			{ status: 500 }
		);
	}
}
