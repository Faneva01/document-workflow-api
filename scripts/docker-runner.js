const { spawnSync } = require('node:child_process');

const args = process.argv.slice(2);

const commands = [
  ['docker', 'compose', ...args],
  ['docker-compose', ...args],
];

for (const [command, ...commandArgs] of commands) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (!result.error) {
    process.exit(result.status ?? 0);
  }
}

console.error('Unable to find Docker Compose. Install Docker Desktop or docker-compose and retry.');
process.exit(1);
