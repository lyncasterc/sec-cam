/* eslint-disable no-undef */
db.createUser({
  user: 'admin',
  pwd: 'password',
  roles: [
    {
      role: 'dbOwner',
      db: 'devDatabase',
    },
  ],
});
