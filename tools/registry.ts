// tools/registry.ts - Centralized Allowlisted Safe JavaScript Tool Registry

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; required?: boolean }>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>, context?: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

// In-memory stores for Notes and Tasks
export interface StarkNote {
  id: string;
  title: string;
  content: string;
  category: 'tactical' | 'suit' | 'research' | 'general';
  createdAt: string;
}

export interface StarkTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  category: 'defense' | 'power' | 'maintenance' | 'flight';
  createdAt: string;
}

const memoryNotes: Map<string, StarkNote[]> = new Map();
const memoryTasks: Map<string, StarkTask[]> = new Map();

// Helper to sanitize and evaluate mathematical expressions safely without eval
function safeCalculate(expr: string): number {
  const cleaned = expr.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/');
  // Allow only digits, basic operators, parens, decimal points, and specific math functions
  if (!/^[-+*/()0-9.,^%eEsincoagtlqrf]+$/.test(cleaned)) {
    throw new Error('Invalid characters in arithmetic expression');
  }

  // Tokens parser
  let pos = 0;
  function peek(): string {
    return cleaned[pos] || '';
  }
  function get(): string {
    return cleaned[pos++] || '';
  }

  function parseExpression(): number {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = get();
      const rhs = parseTerm();
      if (op === '+') val += rhs;
      else val -= rhs;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parseFactor();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = get();
      const rhs = parseFactor();
      if (op === '*') val *= rhs;
      else if (op === '/') {
        if (rhs === 0) throw new Error('Division by zero');
        val /= rhs;
      } else if (op === '%') {
        val %= rhs;
      }
    }
    return val;
  }

  function parseFactor(): number {
    let val = parsePower();
    while (peek() === '^') {
      get();
      const rhs = parsePower();
      val = Math.pow(val, rhs);
    }
    return val;
  }

  function parsePower(): number {
    if (peek() === '-') {
      get();
      return -parsePower();
    }
    if (peek() === '+') {
      get();
      return parsePower();
    }
    if (peek() === '(') {
      get(); // '('
      const val = parseExpression();
      if (get() !== ')') throw new Error('Missing closing parenthesis');
      return val;
    }

    // Check for math functions: sqrt, sin, cos, tan, log, abs, round
    for (const fn of ['sqrt', 'sin', 'cos', 'tan', 'log', 'abs', 'round']) {
      if (cleaned.startsWith(fn, pos)) {
        pos += fn.length;
        if (get() !== '(') throw new Error(`Missing '(' after ${fn}`);
        const arg = parseExpression();
        if (get() !== ')') throw new Error(`Missing ')' after ${fn} argument`);
        switch (fn) {
          case 'sqrt':
            if (arg < 0) throw new Error('Cannot take square root of negative number');
            return Math.sqrt(arg);
          case 'sin':
            return Math.sin((arg * Math.PI) / 180); // degrees
          case 'cos':
            return Math.cos((arg * Math.PI) / 180); // degrees
          case 'tan':
            return Math.tan((arg * Math.PI) / 180); // degrees
          case 'log':
            return Math.log10(arg);
          case 'abs':
            return Math.abs(arg);
          case 'round':
            return Math.round(arg);
        }
      }
    }

    // Number literal
    const start = pos;
    while (/[0-9.]/.test(peek())) {
      get();
    }
    if (pos === start) {
      throw new Error(`Unexpected token at position ${pos}`);
    }
    const numStr = cleaned.slice(start, pos);
    const num = parseFloat(numStr);
    if (isNaN(num)) throw new Error(`Invalid number '${numStr}'`);
    return num;
  }

  const result = parseExpression();
  if (pos < cleaned.length) {
    throw new Error(`Unexpected character '${cleaned[pos]}' at position ${pos}`);
  }
  return result;
}

export const SAFE_TOOLS: Record<string, ToolDefinition> = {
  calculator: {
    name: 'calculator',
    description: 'Perform deterministic, high-precision mathematical calculations without eval (supports +, -, *, /, %, ^, sqrt, sin, cos, tan, log, abs, round).',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'The math expression to evaluate, e.g. "sqrt(144) * 5 + 12^2"', required: true },
      },
      required: ['expression'],
    },
    execute: (args) => {
      const expr = String(args.expression || '');
      try {
        const result = safeCalculate(expr);
        return {
          expression: expr,
          result,
          formatted: Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, ''),
          success: true,
        };
      } catch (err: unknown) {
        return {
          expression: expr,
          error: (err as Error).message || 'Calculation failed',
          success: false,
        };
      }
    },
  },

  dateTime: {
    name: 'dateTime',
    description: 'Get current ISO time, Unix timestamp, and Stark Command worldwide synchronized clocks (Malibu HQ, New York Stark Tower, London, Tokyo, Mumbai).',
    parameters: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Optional specific IANA timezone e.g. "America/New_York", "Asia/Kolkata", "UTC"' },
      },
    },
    execute: (args) => {
      const now = new Date();
      const zones = [
        { name: 'Stark Tower NYC', zone: 'America/New_York' },
        { name: 'Point Dume Malibu HQ', zone: 'America/Los_Angeles' },
        { name: 'London Station', zone: 'Europe/London' },
        { name: 'Tokyo Lab', zone: 'Asia/Tokyo' },
        { name: 'New Delhi / Mumbai Hub', zone: 'Asia/Kolkata' },
      ];

      const clocks = zones.map((z) => ({
        location: z.name,
        time: now.toLocaleTimeString('en-US', { timeZone: z.zone, hour12: true }),
        date: now.toLocaleDateString('en-US', { timeZone: z.zone, dateStyle: 'medium' }),
      }));

      let specificTime = null;
      if (args.timezone) {
        try {
          specificTime = now.toLocaleString('en-US', { timeZone: String(args.timezone) });
        } catch {
          specificTime = 'Invalid timezone';
        }
      }

      return {
        iso: now.toISOString(),
        utcTimestamp: now.getTime(),
        starkClocks: clocks,
        requestedTimezone: specificTime,
        starkStardate: `MK-${now.getFullYear()}.${Math.floor(now.getMonth() * 30 + now.getDate())}`,
      };
    },
  },

  textTools: {
    name: 'textTools',
    description: 'Text analysis and utilities: word count, character count, estimated reading time, slugification, and formatting.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Input text to analyze or format', required: true },
        operation: {
          type: 'string',
          description: 'Operation: "stats", "uppercase", "lowercase", "titlecase", "slugify", "reverse"',
        },
      },
      required: ['text'],
    },
    execute: (args) => {
      const text = String(args.text || '');
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      const readingTimeMinutes = Math.ceil(words / 200);

      const op = String(args.operation || 'stats').toLowerCase();
      let transformed = text;
      switch (op) {
        case 'uppercase':
          transformed = text.toUpperCase();
          break;
        case 'lowercase':
          transformed = text.toLowerCase();
          break;
        case 'titlecase':
          transformed = text.replace(/\b\w/g, (c) => c.toUpperCase());
          break;
        case 'slugify':
          transformed = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
          break;
        case 'reverse':
          transformed = text.split('').reverse().join('');
          break;
      }

      return {
        words,
        characters: chars,
        estimatedReadingTimeMinutes: readingTimeMinutes,
        operation: op,
        result: transformed,
      };
    },
  },

  unitConversion: {
    name: 'unitConversion',
    description: 'Convert between engineering, energy, speed, distance, temperature, and data storage units.',
    parameters: {
      type: 'object',
      properties: {
        value: { type: 'number', description: 'Numeric value to convert', required: true },
        from: { type: 'string', description: 'Source unit (e.g. "km", "miles", "celsius", "fahrenheit", "joules", "kwh", "mach", "mph", "gb", "mb")', required: true },
        to: { type: 'string', description: 'Target unit', required: true },
      },
      required: ['value', 'from', 'to'],
    },
    execute: (args) => {
      const val = Number(args.value);
      const from = String(args.from).toLowerCase();
      const to = String(args.to).toLowerCase();

      let converted: number | null = null;

      // Temperature
      if (from === 'celsius' && to === 'fahrenheit') converted = (val * 9) / 5 + 32;
      else if (from === 'fahrenheit' && to === 'celsius') converted = ((val - 32) * 5) / 9;
      else if (from === 'celsius' && to === 'kelvin') converted = val + 273.15;
      else if (from === 'kelvin' && to === 'celsius') converted = val - 273.15;
      // Distance
      else if (from === 'km' && to === 'miles') converted = val * 0.621371;
      else if (from === 'miles' && to === 'km') converted = val / 0.621371;
      else if (from === 'meters' && to === 'feet') converted = val * 3.28084;
      else if (from === 'feet' && to === 'meters') converted = val / 3.28084;
      // Speed
      else if (from === 'mach' && to === 'mph') converted = val * 767.269;
      else if (from === 'mph' && to === 'mach') converted = val / 767.269;
      else if (from === 'mach' && to === 'kmh') converted = val * 1234.8;
      else if (from === 'kmh' && to === 'mph') converted = val * 0.621371;
      // Energy
      else if (from === 'joules' && to === 'kwh') converted = val / 3600000;
      else if (from === 'kwh' && to === 'joules') converted = val * 3600000;
      else if (from === 'gigajoules' && to === 'arc_percent') converted = (val / 3.0) * 100; // Stark Arc Reactor baseline ~3GJ/s
      // Data
      else if (from === 'mb' && to === 'gb') converted = val / 1024;
      else if (from === 'gb' && to === 'mb') converted = val * 1024;
      else if (from === 'gb' && to === 'tb') converted = val / 1024;

      if (converted === null) {
        return {
          success: false,
          error: `Conversion from "${from}" to "${to}" is not supported.`,
        };
      }

      return {
        success: true,
        originalValue: val,
        fromUnit: from,
        targetUnit: to,
        convertedValue: Number(converted.toFixed(4)),
      };
    },
  },

  jsonValidator: {
    name: 'jsonValidator',
    description: 'Validate, format, minify, and inspect JSON payloads.',
    parameters: {
      type: 'object',
      properties: {
        jsonString: { type: 'string', description: 'Raw JSON text to validate', required: true },
        action: { type: 'string', description: '"validate", "format", "minify"' },
      },
      required: ['jsonString'],
    },
    execute: (args) => {
      const raw = String(args.jsonString || '');
      const action = String(args.action || 'format').toLowerCase();
      try {
        const parsed = JSON.parse(raw);
        let output = raw;
        if (action === 'format') output = JSON.stringify(parsed, null, 2);
        else if (action === 'minify') output = JSON.stringify(parsed);

        return {
          valid: true,
          type: Array.isArray(parsed) ? 'array' : typeof parsed,
          keysCount: typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0,
          result: output,
        };
      } catch (err: unknown) {
        return {
          valid: false,
          error: (err as Error).message,
        };
      }
    },
  },

  notes: {
    name: 'notes',
    description: 'Manage in-memory Stark technical notes and tactical logs.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: '"list", "create", "delete"', required: true },
        title: { type: 'string', description: 'Note title (for create)' },
        content: { type: 'string', description: 'Note body content (for create)' },
        category: { type: 'string', description: 'Category: "tactical", "suit", "research", "general"' },
        id: { type: 'string', description: 'Note ID (for delete)' },
      },
      required: ['action'],
    },
    execute: (args, context) => {
      const sessionId = (context?.sessionId as string) || 'default-stark-session';
      if (!memoryNotes.has(sessionId)) {
        // Pre-populate with realistic Stark tactical notes
        memoryNotes.set(sessionId, [
          {
            id: 'note-01',
            title: 'Nanotech Mark LXXXV Power Distribution',
            content: 'Divert 30% auxiliary capacitor reserves to chest unibeam during heavy kinetic impact.',
            category: 'suit',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'note-02',
            title: 'VERONICA Orbital Drop Trajectory',
            content: 'Maintain satellite geosynchronous orbit over North Atlantic at 35,786 km altitude.',
            category: 'tactical',
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      const notes = memoryNotes.get(sessionId)!;
      const action = String(args.action).toLowerCase();

      if (action === 'create') {
        const newNote: StarkNote = {
          id: `note-${Date.now()}`,
          title: String(args.title || 'Untitled Log'),
          content: String(args.content || ''),
          category: (['tactical', 'suit', 'research', 'general'].includes(String(args.category))
            ? args.category
            : 'general') as StarkNote['category'],
          createdAt: new Date().toISOString(),
        };
        notes.unshift(newNote);
        return { success: true, message: 'Note logged into Stark database.', note: newNote };
      } else if (action === 'delete') {
        const id = String(args.id);
        const idx = notes.findIndex((n) => n.id === id);
        if (idx !== -1) {
          notes.splice(idx, 1);
          return { success: true, message: `Note ${id} purged.` };
        }
        return { success: false, error: 'Note not found' };
      }

      return { success: true, count: notes.length, notes };
    },
  },

  tasks: {
    name: 'tasks',
    description: 'Manage tactical defense protocol tasks and suit maintenance checklist.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: '"list", "create", "toggle", "delete"', required: true },
        title: { type: 'string', description: 'Task title (for create)' },
        priority: { type: 'string', description: '"low", "medium", "high", "critical"' },
        category: { type: 'string', description: '"defense", "power", "maintenance", "flight"' },
        id: { type: 'string', description: 'Task ID (for toggle/delete)' },
      },
      required: ['action'],
    },
    execute: (args, context) => {
      const sessionId = (context?.sessionId as string) || 'default-stark-session';
      if (!memoryTasks.has(sessionId)) {
        memoryTasks.set(sessionId, [
          {
            id: 'task-01',
            title: 'Calibrate Mark LXXXV repulsor emitters to 100% capacity',
            priority: 'high',
            completed: true,
            category: 'maintenance',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'task-02',
            title: 'Scan perimeter defense grid sensors around Malibu residence',
            priority: 'critical',
            completed: false,
            category: 'defense',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'task-03',
            title: 'Verify Arc Reactor palladium core replacement with badassium isotope',
            priority: 'medium',
            completed: true,
            category: 'power',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'task-04',
            title: 'Re-align VERONICA satellite telemetry link',
            priority: 'high',
            completed: false,
            category: 'flight',
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      const tasks = memoryTasks.get(sessionId)!;
      const action = String(args.action).toLowerCase();

      if (action === 'create') {
        const newTask: StarkTask = {
          id: `task-${Date.now()}`,
          title: String(args.title || 'Tactical Directive'),
          priority: (['low', 'medium', 'high', 'critical'].includes(String(args.priority))
            ? args.priority
            : 'medium') as StarkTask['priority'],
          completed: false,
          category: (['defense', 'power', 'maintenance', 'flight'].includes(String(args.category))
            ? args.category
            : 'defense') as StarkTask['category'],
          createdAt: new Date().toISOString(),
        };
        tasks.push(newTask);
        return { success: true, message: 'Protocol directive logged.', task: newTask };
      } else if (action === 'toggle') {
        const id = String(args.id);
        const task = tasks.find((t) => t.id === id);
        if (task) {
          task.completed = !task.completed;
          return { success: true, message: `Task status updated: ${task.completed ? 'COMPLETED' : 'PENDING'}`, task };
        }
        return { success: false, error: 'Task not found' };
      } else if (action === 'delete') {
        const id = String(args.id);
        const idx = tasks.findIndex((t) => t.id === id);
        if (idx !== -1) {
          tasks.splice(idx, 1);
          return { success: true, message: `Task ${id} removed.` };
        }
        return { success: false, error: 'Task not found' };
      }

      return { success: true, count: tasks.length, tasks };
    },
  },
};
