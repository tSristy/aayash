'use strict';
const { AdminRole, AdminUser, sequelize } = require('../src/models');
const { hashPassword, MIN_PASSWORD_LENGTH } = require('../src/auth/password');
const readline = require('node:readline');

function ask(prompt, secret = false) {
  return new Promise((resolve, reject) => {
    if (secret && process.stdin.isTTY && process.stdin.setRawMode) {
      let answer = '';
      process.stdout.write(prompt);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      function onData(chunk) {
        for (const c of chunk.toString()) {
          if (c === '\r' || c === '\n') {
            process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause();
            process.stdout.write('\n'); return resolve(answer);
          }
          if (c === '\u0003') {
            process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause();
            process.stdout.write('\n');
            return reject(new Error('Password entry cancelled (Ctrl+C).'));
          }
          if (c === '\u007f' || c === '\b') {
            if (answer.length) { answer = answer.slice(0, -1); process.stdout.write('\b \b'); }
            continue;
          }
          if (answer.length < 128) { answer += c; process.stdout.write('*'); }
        }
      }
      process.stdin.on('data', onData);
    } else {
      // Never echo a secret when the shell does not support masked TTY input.
      if (secret) return reject(new Error('Masked password input requires a terminal. Run this command in Windows PowerShell or Windows Terminal.'));
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(prompt, (value) => { rl.close(); resolve(value); });
    }
  });
}

(async () => {
  try {
    await sequelize.authenticate();
    const username = (process.env.ADMIN_USERNAME || await ask('New admin username: ')).trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,80}$/.test(username)) throw new Error('Username must be 3-80 letters, digits, dot, dash or underscore.');
    const existing = await AdminUser.count();
    if (existing > 0) throw new Error('Bootstrap disabled: an admin user already exists. Use an authenticated admin management workflow.');
    const password = process.env.ADMIN_PASSWORD || await ask(`New admin password (minimum ${MIN_PASSWORD_LENGTH} characters; input is masked): `, true);
    if (password.length < MIN_PASSWORD_LENGTH || password === 'aayash123') throw new Error(`Use a unique password of at least ${MIN_PASSWORD_LENGTH} characters.`);
    const hash = await hashPassword(password);
    await sequelize.transaction(async (t) => {
      const [role] = await AdminRole.findOrCreate({ where: { code: 'super_admin' }, defaults: { name: 'Super Admin' }, transaction: t });
      await AdminUser.create({ role_id: role.id, username, name: 'Admin', password_hash: hash,
        is_active: true, failed_attempts: 0 }, { transaction: t });
    });
    console.log(`Created initial admin account: ${username}. No password was written to files.`);
  } catch (e) { console.error('Admin creation failed:', e.message); process.exitCode = 1; }
  finally { await sequelize.close(); }
})();
