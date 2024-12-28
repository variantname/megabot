import { NextResponse } from 'next/server';
import dbConnect from '@/utils/db/db';
import User from '@/utils/db/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
	try {
		await dbConnect();

		const { email, password } = await req.json();

		// Проверка существующего пользователя
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return NextResponse.json(
				{ error: 'Email уже используется' },
				{ status: 400 }
			);
		}

		// Хешируем пароль
		const hashedPassword = await bcrypt.hash(password, 10);

		// Создаем пользователя (только один раз!)
		const user = await User.create({
			email,
			password: hashedPassword,
			user_type: 'USER_FREE',
			wb_api_key: null,
			suppliers: null,
			supplier_name: null,
			active: true,
			validated: false,
			active_till: null,
			last_login: new Date(),
			telegram_id: null,
			notification_settings: {},
			notification_enabled: true,
			total_supplies_booked: 0,
			ip_history: [],
			payment_history: [],
			supplies: [],
		});

		return NextResponse.json(
			{
				user: user,
				message: 'Регистрация успешна',
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Registration error:', error);
		return NextResponse.json(
			{ error: 'Ошибка при регистрации' },
			{ status: 500 }
		);
	}
}
