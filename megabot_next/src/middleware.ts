import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
	// Проверяем только авторизацию для /user/* роутов
	if (!request.nextUrl.pathname.startsWith('/user')) {
		return NextResponse.next();
	}

	try {
		const session = await getToken({ req: request });
		if (!session) {
			return NextResponse.redirect(new URL('/login', request.url));
		}

		return NextResponse.next();
	} catch (error) {
		console.error('Middleware error:', error);
		return NextResponse.redirect(new URL('/error', request.url));
	}
}

export const config = {
	matcher: '/user/:path*',
};
