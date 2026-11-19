export const outcomes = { eaten: 'Gefressen', partial: 'Teilweise gefressen', refused: 'Verweigert' };
export const empty = () => ({ version: 1, animals: [], foods: [], meals: [] });
export const snapshot = ({ name, amount, unit, supplement, note }) => ({ name, amount, unit, supplement, note });

export function merge(local, incoming) {
  let added = 0;
  let conflicts = 0;
  const same = (left, right) => Object.is(left, right) || (left && right && typeof left === 'object' && typeof right === 'object' && Object.keys(left).length === Object.keys(right).length && Object.keys(left).every(key => Object.hasOwn(right, key) && same(left[key], right[key])));
  const data = empty();
  for (const key of ['animals', 'foods', 'meals']) {
    const records = new Map(local[key].map(item => [item.id, item]));
    for (const item of incoming[key]) {
      if (!records.has(item.id)) { records.set(item.id, item); added++; }
      else if (!same(records.get(item.id), item)) conflicts++;
    }
    data[key] = [...records.values()];
  }
  return { data: validate(data), added, conflicts };
}

export function day(date = new Date()) {
  return [String(date.getFullYear()).padStart(4, '0'), date.getMonth() + 1, date.getDate()]
    .map(part => String(part).padStart(2, '0')).join('-');
}

export const dateOf = value => new Date(`${value}T12:00:00`);
export function shift(value, days) {
  const date = dateOf(value);
  date.setDate(date.getDate() + days);
  return day(date);
}
export function shiftMonth(value, months) {
  const date = dateOf(value);
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const end = dateOf(day(date));
  end.setMonth(end.getMonth() + 1, 0);
  date.setDate(Math.min(originalDay, end.getDate()));
  return day(date);
}
export const monday = value => shift(value, -((dateOf(value).getDay() + 6) % 7));
export const week = value => Array.from({ length: 7 }, (_, index) => shift(monday(value), index));
export function month(value) {
  const first = `${value.slice(0, 7)}-01`;
  const last = shift(shiftMonth(first, 1), -1);
  const end = week(last).at(-1);
  const days = [];
  for (let cursor = monday(first); cursor <= end; cursor = shift(cursor, 1)) days.push(cursor);
  return days;
}
export const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && day(dateOf(value)) === value;
export const distance = (from, to) => (Date.parse(to) - Date.parse(from)) / 86400000;

export function latest(animalsMeals, from = '', through = day()) {
  return animalsMeals.reduce((last, meal) => meal.result !== 'refused' && meal.date >= from && meal.date <= through && meal.date > last ? meal.date : last, '');
}
export function nextDue(animal, meals, today = day()) {
  if (animal.archived || !animal.first || !animal.interval) return '';
  const last = latest(meals.filter(meal => meal.animalId === animal.id), animal.first, today);
  return last ? shift(last, animal.interval) : animal.first;
}
export function counts(meals) {
  const result = { eaten: 0, partial: 0, refused: 0 };
  meals.forEach(meal => result[meal.result]++);
  return { ...result, total: meals.length, rate: meals.length ? (result.eaten + result.partial) / meals.length : null };
}
export function aggregate(meals, start, end, period) {
  const matching = meals.filter(meal => meal.date >= start && meal.date <= end);
  const timeline = new Map();
  const foods = new Map();
  const animals = new Map();
  const add = (map, key, meal) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(meal);
  };
  matching.forEach(meal => {
    add(timeline, period === 'week' ? monday(meal.date) : `${meal.date.slice(0, 7)}-01`, meal);
    add(foods, meal.food.name, meal);
    add(animals, meal.animalId, meal);
  });
  const entries = map => [...map].map(([key, value]) => ({ key, ...counts(value) }));
  return { ...counts(matching), timeline: entries(timeline).sort((left, right) => left.key.localeCompare(right.key)), foods: entries(foods).sort((left, right) => right.total - left.total), animals: entries(animals) };
}

export function validate(data, today = day()) {
  const text = value => typeof value === 'string';
  const required = value => text(value) && Boolean(value.trim());
  const food = item => item && required(item.name) && (item.amount === '' || (text(item.amount) && Number.isFinite(Number(item.amount)) && Number(item.amount) > 0))
    && ['unit', 'supplement', 'note'].every(key => text(item[key]));
  const collection = (items, predicate) => Array.isArray(items) && items.every(item => item && required(item.id) && predicate(item))
    && new Set(items.map(item => item.id)).size === items.length;
  if (data?.version !== 1 || !collection(data.foods, item => food(item) && typeof item.archived === 'boolean')) throw new Error('Das Backup enthält ungültige Futtervorlagen.');
  const foodIds = new Set(data.foods.map(item => item.id));
  if (!collection(data.animals, item => required(item.name) && required(item.group) && ['species', 'location', 'note', 'foodId'].every(key => text(item[key]))
    && (!item.foodId || foodIds.has(item.foodId)) && (item.first === '' || validDay(item.first)) && typeof item.archived === 'boolean'
    && ((item.first === '' && item.interval === 0) || (validDay(item.first) && Number.isInteger(item.interval) && item.interval >= 1 && item.interval <= 3650)))) throw new Error('Das Backup enthält ungültige Tierprofile.');
  const animalIds = new Set(data.animals.map(item => item.id));
  if (!collection(data.meals, meal => animalIds.has(meal.animalId) && validDay(meal.date) && meal.date <= today
    && Object.hasOwn(outcomes, meal.result) && food(meal.food))) throw new Error('Das Backup enthält ungültige Fütterungen.');
  return data;
}