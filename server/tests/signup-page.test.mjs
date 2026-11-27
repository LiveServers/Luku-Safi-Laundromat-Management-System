import { expect, test } from 'vitest';
import Register from '../../frontend/app/auth/register/page.tsx';

test('the old signup page sends visitors to sign-in', () => {
  expect(Register).toThrow(expect.objectContaining({
    digest: expect.stringContaining(';/auth/login;'),
  }));
});
