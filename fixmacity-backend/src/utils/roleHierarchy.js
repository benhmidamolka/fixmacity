/**
 * Role hierarchy and permission mapping.
 * Defines which roles can perform which actions.
 * Actions are mapped to route patterns or specific permissions.
 */
const rolePermissions = {
  // Super admin can do everything
  super_admin: ['*'],

  // President can manage declarations, propositions, tasks, agents, notifications
  president: [
    'declarations:*',
    'propositions:*',
    'tasks:*',
    'agent:*',
    'notifications:*',
    'public:read',
    'auth:read'
  ],

  // Chef service can manage tasks and declarations related to cooking/food
  chef_service: [
    'tasks:create',
    'tasks:read',
    'tasks:update:own',
    'declarations:read',
    'declarations:create',
    'declarations:update:*',
    'propositions:read',
    'public:read'
  ],

  // Agent (field worker) can update task status and read public info
  agent: [
    'tasks:update:status',
    'tasks:read:own',
    'public:read'
  ],

  // Regular authenticated user can read public and create declarations
  user: [
    'public:read',
    'declarations:create',
    'declarations:read:own',
    'propositions:read'
  ],

  // Unauthenticated users have no permissions by default
  unauthenticated: []
};

/**
 * Check if a role has permission for a given action.
 * Action format: 'resource:action' or 'resource:action:detail'
 * Wildcard '*' means all actions.
 * @param {string} role - The user's role
 * @param {string} action - The action to check (e.g., 'declarations:create')
 * @returns {boolean}
 */
function hasPermission(role, action) {
  const permissions = rolePermissions[role] || rolePermissions.unauthenticated;

  // Super admin shortcut
  if (permissions.includes('*')) return true;

  // Check exact match
  if (permissions.includes(action)) return true;

  // Check wildcard matches (e.g., 'declarations:*' matches 'declarations:create')
  const wildcardPermissions = permissions.filter(p => p.endsWith(':*'));
  for (const wildcard of wildcardPermissions) {
    const base = wildcard.slice(0, -2); // Remove ':*'
    if (action.startsWith(base + ':')) return true;
  }

  return false;
}

module.exports = { rolePermissions, hasPermission };