function createStaffAccountSchema(z) {
  return z.object({
    name: z.string().trim().min(1, 'Enter a name.').refine(
      name => !name.includes('\0'),
      'Name cannot contain null characters.'
    ),
    email: z.email('Enter a valid email address.'),
    password: z.string().min(1, 'Enter a password.').refine(
      password => new TextEncoder().encode(password).length <= 72 && !password.includes('\0'),
      'Password must be at most 72 UTF-8 bytes and cannot contain null characters.'
    ),
    role: z.enum(['attendant', 'owner'], 'Choose a role.'),
    location_id: z.uuid('Choose a location.'),
  });
}

module.exports = { createStaffAccountSchema };
