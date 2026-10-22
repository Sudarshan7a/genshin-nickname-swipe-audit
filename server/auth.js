// Invite gate for all /api/* (except /api/health), admin gate layered on top.
// Deliberately generic errors: never hint which code was wrong or whether one exists.
export function requireInvite(req, res, next) {
  const code = req.header('x-invite-code');
  if (typeof code === 'string' && code.length > 0 && code === process.env.INVITE_CODE) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

export function requireAdmin(req, res, next) {
  const code = req.header('x-admin-code');
  if (typeof code === 'string' && code.length > 0 && code === process.env.ADMIN_CODE) return next();
  return res.status(403).json({ error: 'forbidden' });
}
