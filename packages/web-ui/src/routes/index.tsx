import { createFileRoute, redirect } from '@tanstack/react-router';
import { getAuthUser } from '@/lib/auth';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { userId } = await getAuthUser();
    
    if (userId) {
      throw redirect({
        to: '/dashboard',
      });
    } else {
      throw redirect({
        to: '/sign-in',
      });
    }
  },
});
