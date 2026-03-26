export const sanitizeUserIds = (userIds: string[]): string[] =>
  userIds.map((userId) => userId.trim().replace(/[^a-zA-Z0-9_-]/g, ''));
