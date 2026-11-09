import readline from 'readline';

// Prompt for a secret on stdin; typed characters are hidden when running in a terminal
const askSecret = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });

  if (process.stdin.isTTY) {
    rl._writeToOutput = (text) => {
      if (text.includes(question)) rl.output.write(text);
    };
  }

  rl.question(question, (answer) => {
    rl.close();
    if (process.stdin.isTTY) process.stdout.write('\n');
    resolve(answer);
  });
});

export { askSecret };
