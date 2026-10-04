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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const CLASS_TYPES = { Lecture: 'Лекція', Practical: 'Практична' };

function getAllClasses(data) {
  return data.schedule.flatMap((d) =>
    d.classes.map((c) => ({ ...c, day: d.day }))
  );
}

function formatClass(c) {
  const teachers = c.teacher ? c.teacher.map((t) => t.trim()).join(', ') : 'не вказано';
  const room = c.isOnline ? 'онлайн' : c.classroom;
  const sub = c.subgroup ? `, підгрупа ${c.subgroup}` : '';
  const type = CLASS_TYPES[c.classType] ?? c.classType;
  return `${c.lessonNumber}. ${c.time} | ${c.name} (${type}) | ${teachers} | ${room}${sub}`;
}

const program = new Command();
program
  .name('schedule')
  .description('Консольна програма для перегляду розкладу занять групи')
  .version('1.0.0', '-v, --version', 'показати версію програми')
  .option('-f, --file <path>', 'шлях до JSON-файлу з розкладом', 'schedule.json')
  .helpOption('-h, --help', 'показати довідку');



program
  .command('day <day>')
  .description('Показати заняття за обраний день тижня')
  .option('-s, --subgroup <n>', 'показати лише заняття вказаної підгрупи (та спільні)')
  .action((dayArg, options) => {
    const day = DAYS.find((d) => d.toLowerCase() === dayArg.toLowerCase());
    if (!day) {
      fail(`невідомий день "${dayArg}". Допустимі: ${DAYS.join(', ')}.`);
    }

    let subgroup = null;
    if (options.subgroup !== undefined) {
      subgroup = Number(options.subgroup);
      if (!Number.isInteger(subgroup) || subgroup < 1) {
        fail(`підгрупа має бути додатним цілим числом, отримано "${options.subgroup}".`);
      }
    }

    const result = getAllClasses(getData())
      .filter((c) => c.day === day)
      .filter((c) => subgroup === null || c.subgroup === null || c.subgroup === subgroup)
      .sort((a, b) => a.lessonNumber - b.lessonNumber);

    if (result.length === 0) {
      console.log(`На ${day} занять не знайдено.`);
      return;
    }
    result.forEach((c) => console.log(formatClass(c)));
  });


program
  .command('teacher <name>')
  .description('Показати заняття викладача (за частиною прізвища чи імені)')
  .option('-r, --remote', 'показати лише дистанційні заняття')
  .action((name, options) => {
    const query = name.trim().toLowerCase();

    const result = getAllClasses(getData())
      .filter((c) => c.teacher !== null && c.teacher.some((t) => t.trim().toLowerCase().includes(query)))
      .filter((c) => !options.remote || c.isOnline);

    if (result.length === 0) {
      console.log(`Занять викладача "${name}" не знайдено.`);
      return;
    }
    result.forEach((c) => console.log(`${c.day}: ${formatClass(c)}`));
  });


program
  .command('week <type>')
  .description('Показати розклад для чисельника (odd) або знаменника (even) разом зі щотижневими заняттями')
  .action((type) => {
    const map = { odd: 'Odd', even: 'Even' };
    const weekType = map[type.toLowerCase()];
    if (!weekType) {
      fail(`невідомий тип тижня "${type}". Допустимі: odd (чисельник), even (знаменник).`);
    }

    for (const d of getData().schedule) {
      const list = d.classes
        .filter((c) => c.weekType === weekType || c.weekType === 'Weekly')
        .sort((a, b) => a.lessonNumber - b.lessonNumber);
      console.log(`\n${d.day}:`);
      if (list.length === 0) console.log('  занять немає');
      list.forEach((c) => console.log(`  ${formatClass(c)}`));
    }
  });



program.parse();