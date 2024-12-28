import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Определяем типы
declare module 'next-auth' {
	interface User {
		id: string;
		email: string;
		user_type: string;
	}

	interface Session {
		user: {
			id: string;
			email: string;
			user_type: string;
		};
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		user_type?: string;
	}
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
