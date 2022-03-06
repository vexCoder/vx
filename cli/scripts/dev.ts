import concurrently from 'concurrently';

const args = process.argv.slice(2).join(' ')
// nodemon dist/cli.js --dir example
concurrently(
  [
    { command: 'yarn watch', prefixColor: 'blue', name: '👁 watch' },
    { command: `yarn dev:cli ${args} --dir example --noconfirm --author vexCoder --email freelance.starterpack08@gmail.com`, prefixColor: 'magenta', name: '🚀 exec' }
  ],
  {
    killOthers: ['failure', 'success']
  }
)