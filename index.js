import { Command } from 'commander';
import { readFileSync } from 'node:fs';

function fail(message) {
  console.error(`Помилка: ${message}`);
  process.exit(1);
}

function loadData(path) {
  try {
    const text = readFileSync(path, 'utf-8');
    return JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') {
      fail(`файл "${path}" не знайдено.`);
    }
    if (err instanceof SyntaxError) {
      fail(`файл "${path}" містить некоректний JSON.`);
    }
    fail(`не вдалося прочитати файл "${path}": ${err.message}`);
  }
}

function getData() {
  const { file } = program.opts();
  return loadData(file);
}



const program = new Command();
program
  .name('schedule')
  .description('Консольна програма для перегляду розкладу занять групи')
  .version('1.0.0', '-v, --version', 'показати версію програми')
  .option('-f, --file <path>', 'шлях до JSON-файлу з розкладом', 'schedule.json')
  .helpOption('-h, --help', 'показати довідку');


program.parse();