(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory();
  } else {
    root.CampusScheduleRules = factory();
  }
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DAY_FIELDS = ['id', 'date', 'kind', 'sourceDate', 'reason'];
  const EXCEPTION_FIELDS = ['id', 'courseId', 'kind', 'date', 'toDate', 'start', 'end', 'location', 'reason'];
  const DAY_MS = 86400000;

  function invalid(message) {
    throw new TypeError(message);
  }

  // 只接收完整的数据属性，避免继承字段、访问器和特殊键进入规范化结果。
  function exactObject(value, fields) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('规则项必须是普通对象。');
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) invalid('规则项的原型无效。');
    const keys = Reflect.ownKeys(value);
    if (keys.length !== fields.length || keys.some(key => !fields.includes(key))) {
      invalid('规则项包含未知字段或缺少必需字段。');
    }
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value') || !descriptor.enumerable) {
        invalid('规则字段必须是自身的可枚举数据属性。');
      }
    }
  }

  function ruleArray(value, limit) {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > limit) {
      invalid('规则列表类型或数量无效。');
    }
    if (Reflect.ownKeys(value).length !== value.length + 1) invalid('规则列表包含空项或额外字段。');
    for (let i = 0; i < value.length; i += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value') || !descriptor.enumerable) {
        invalid('规则列表不能包含空项或访问器。');
      }
    }
  }

  function validId(value) {
    return typeof value === 'string' && value.length <= 100 && value.trim().length > 0;
  }

  function text(value, limit) {
    if (typeof value !== 'string' || value.length > limit) invalid('文本字段类型或长度无效。');
    return value.trim();
  }

  function dateNumber(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const timestamp = Date.UTC(year, month - 1, day);
    const parsed = new Date(timestamp);
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
      ? timestamp / DAY_MS : null;
  }

  function requireDate(value) {
    if (dateNumber(value) === null) invalid('日期须为 2000–2100 年内真实的 YYYY-MM-DD。');
    return value;
  }

  function timeValid(value) {
    return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function rangeValid(start, end) {
    return timeValid(start) && timeValid(end) && start < end;
  }

  function empty() {
    return { days: [], exceptions: [] };
  }

  function week(date, termStart) {
    const day = dateNumber(date);
    const first = dateNumber(termStart);
    return day === null || first === null ? null : Math.floor((day - first) / 7) + 1;
  }

  function validate(input, courses) {
    exactObject(input, ['days', 'exceptions']);
    ruleArray(input.days, 500);
    ruleArray(input.exceptions, 1000);
    if (!Array.isArray(courses)) invalid('课程模板必须是数组。');
    const courseIds = new Set();
    for (const course of courses) {
      if (!course || typeof course !== 'object' || !validId(course.id)) invalid('课程模板缺少有效 id。');
      courseIds.add(course.id);
    }
    const ids = new Set();
    const dates = new Set();
    const removals = new Set();
    function uniqueId(id) {
      if (!validId(id) || ids.has(id)) invalid('规则 id 无效或重复。');
      ids.add(id);
      return id;
    }

    const days = input.days.map(item => {
      exactObject(item, DAY_FIELDS);
      const id = uniqueId(item.id);
      const date = requireDate(item.date);
      if (dates.has(date)) invalid('同一天不能有多个整体规则。');
      dates.add(date);
      if (item.kind !== 'off' && item.kind !== 'follow') invalid('整体规则类型无效。');
      if (item.kind === 'off') {
        if (item.sourceDate !== '') invalid('停课规则的 sourceDate 必须为空字符串。');
      } else {
        requireDate(item.sourceDate);
      }
      return { id, date, kind: item.kind, sourceDate: item.sourceDate, reason: text(item.reason, 200) };
    });

    const exceptions = input.exceptions.map(item => {
      exactObject(item, EXCEPTION_FIELDS);
      const id = uniqueId(item.id);
      if (!validId(item.courseId) || !courseIds.has(item.courseId)) invalid('单课特例引用了不存在的课程。');
      const date = requireDate(item.date);
      if (!['cancel', 'move', 'extra'].includes(item.kind)) invalid('单课特例类型无效。');
      const location = text(item.location, 100);
      const reason = text(item.reason, 200);
      if (item.kind === 'cancel') {
        if (item.toDate !== '' || item.start !== '' || item.end !== '' || item.location !== '') {
          invalid('取消规则的目标日期、起止时间和地点必须为空字符串。');
        }
      } else {
        if (!rangeValid(item.start, item.end)) invalid('起止时间必须为 HH:MM，且开始早于结束。');
        if (item.kind === 'move') requireDate(item.toDate);
        else if (item.toDate !== '') invalid('补课规则的 toDate 必须为空字符串。');
      }
      if (item.kind === 'cancel' || item.kind === 'move') {
        const key = JSON.stringify([item.courseId, date]);
        if (removals.has(key)) invalid('同一课程同一天不能重复取消或调课。');
        removals.add(key);
      }
      return {
        id, courseId: item.courseId, kind: item.kind, date, toDate: item.toDate,
        start: item.start, end: item.end, location, reason
      };
    });
    return { days, exceptions };
  }

  function compare(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  function resolve(input, date) {
    // 无递归、无日期区间展开；异常数据统一降级为空，不访问任何外部状态。
    try {
      if (!input || typeof input !== 'object' || dateNumber(date) === null || dateNumber(input.termStart) === null) return [];
      const classes = input.classes;
      if (!Array.isArray(classes)) return [];
      const rules = validate(input.rules === undefined ? empty() : input.rules, classes);
      const courses = new Map();
      for (const course of classes) {
        if (!courses.has(course.id)) courses.set(course.id, course);
      }
      const dayRule = rules.days.find(item => item.date === date);
      const sourceDate = dayRule && dayRule.kind === 'follow' ? dayRule.sourceDate : date;
      const sourceDay = new Date(dateNumber(sourceDate) * DAY_MS).getUTCDay() || 7;
      const sourceWeek = week(sourceDate, input.termStart);
      const removed = new Set(rules.exceptions
        .filter(item => item.date === date && (item.kind === 'cancel' || item.kind === 'move'))
        .map(item => item.courseId));
      const result = [];
      if (!dayRule || dayRule.kind !== 'off') {
        for (const course of courses.values()) {
          const startWeek = course.startWeek ?? 1;
          const endWeek = course.endWeek ?? 30;
          const parity = course.parity ?? 'all';
          if (course.day !== sourceDay || !rangeValid(course.start, course.end) || removed.has(course.id)
              || !Number.isInteger(startWeek) || !Number.isInteger(endWeek) || startWeek < 1 || endWeek < startWeek
              || sourceWeek < startWeek || sourceWeek > endWeek
              || !['all', 'odd', 'even'].includes(parity)
              || (parity !== 'all' && sourceWeek % 2 !== (parity === 'odd' ? 1 : 0))) continue;
          result.push({
            ...course, date, sourceDate, occurrenceId: `base:${course.id}:${date}`,
            ruleLabel: dayRule ? `按${sourceDate}补课` : '', exceptionId: ''
          });
        }
      }
      // 显式特例最后添加，不受整日停课、源日期周次和其他特例的递归影响。
      for (const item of rules.exceptions) {
        if (!((item.kind === 'move' && item.toDate === date) || (item.kind === 'extra' && item.date === date))) continue;
        const course = courses.get(item.courseId);
        if (!course) continue;
        const occurrence = {
          ...course, start: item.start, end: item.end, date, sourceDate: item.date,
          occurrenceId: `exception:${item.id}`, ruleLabel: item.kind === 'move' ? '调课' : '补课', exceptionId: item.id
        };
        if (item.location !== '') {
          occurrence.location = item.location;
          occurrence.roomId = '';
        }
        result.push(occurrence);
      }
      return result.sort((a, b) => compare(a.start, b.start) || compare(a.end, b.end) || compare(a.occurrenceId, b.occurrenceId));
    } catch (_) {
      return [];
    }
  }

  return { validate, empty, resolve, week };
}));
