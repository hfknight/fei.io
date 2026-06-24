import { verifyAccess, AuthError } from '../../lib/auth';
import { json } from '../../lib/http';
import type { Env } from '../../lib/env';

// Guards every /api/admin/* route. Verifies the Cloudflare Access JWT (or the
// dev bypass) before the route handler runs, so the backend never assumes edge
// enforcement is present.
export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const identity = await verifyAccess(context.request, context.env);
    context.data.identity = identity;
  } catch (err) {
    if (err instanceof AuthError) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }
    throw err;
  }
  return context.next();
};
