const {Bot} = require('node-telegram-bot-api');

const {
  CATEGORIES,
  resolveCategory,
  validateAmount,
  validateDate,
  validateDescription,
  validateTransactionCode,
  normalize,
} = require('./expenseBotValidation');

// IMPORTANT:
// This imports the Telegram-only service, NOT the normal application DB.
// The service authenticates with TELEGRAM_DATABASE_URL and therefore inherits
// the restrictive PostgreSQL permissions/RLS created by the migration.
const {
  createExpense,
  updateExpense,
  getRecentExpenses,
  getLocations,
} = require('./telegramExpenseService');

const pendingCreates = new Map();

function allowedUserIds() {
  return String(process.env.TELEGRAM_ALLOWED_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAllowed(userId) {
  return allowedUserIds().includes(String(userId));
}

function money(value) {
  return `KSh ${Number(value).toLocaleString('en-KE', {
    maximumFractionDigits: 2,
  })}`;
}

async function resolveLocation(input) {
  const locations = await getLocations();
  const needle = normalize(input);

  const exact = locations.find((location) =>
    [location.id, location.name, location.display_name]
      .filter(Boolean)
      .some((value) => normalize(value) === needle)
  );

  if (exact) return exact;

  const matches = locations.filter((location) =>
    [location.name, location.display_name, location.address]
      .filter(Boolean)
      .some((value) => normalize(value).includes(needle))
  );

  return matches.length === 1 ? matches[0] : null;
}

function formatExpense(expense) {
  return [
    `ID: ${expense.id}`,
    `📍 ${expense.location_name}`,
    `📂 ${expense.category}`,
    `📝 ${expense.description}`,
    `💰 ${money(expense.amount)}`,
    `📅 ${String(expense.date).slice(0, 10)}`,
    `🔖 ${expense.transaction_code || 'No transaction code'}`,
  ].join('\n');
}

async function parseExpenseMessage(text) {
  const body = text.replace(/^\/expense(?:@\w+)?/i, '').trim();

  if (!body) return null;

  const fields = body.split('|').map((value) => value.trim());

  // Five fields are mandatory. Transaction code is the only optional field.
  if (fields.length < 5 || fields.length > 6) {
    throw new Error(
      'Use: /expense Location | Category | Description | Amount | YYYY-MM-DD | TransactionCode(optional)'
    );
  }

  const [
    locationInput,
    categoryInput,
    descriptionInput,
    amountInput,
    dateInput,
    transactionCodeInput,
  ] = fields;

  const location = await resolveLocation(locationInput);

  if (!location) {
    throw new Error(`Unknown or ambiguous location: ${locationInput}`);
  }

  const category = resolveCategory(categoryInput);

  if (!category) {
    throw new Error(`Unknown or ambiguous category: ${categoryInput}`);
  }

  return {
    location,
    location_id: location.id,
    category,
    description: validateDescription(descriptionInput),
    amount: validateAmount(amountInput),
    date: validateDate(dateInput),
    transaction_code: validateTransactionCode(transactionCodeInput),
  };
}

async function initTelegramExpenseBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('[telegram-expenses] Bot disabled: TELEGRAM_BOT_TOKEN is missing.');
    return null;
  }

  if (allowedUserIds().length === 0) {
    throw new Error(
      'TELEGRAM_ALLOWED_USER_IDS is empty. Refusing to start a database-writing bot without a Telegram user whitelist.'
    );
  }

  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
  bot.startPolling();

  bot.hears(/^\/start(?:@\w+)?$/i, async (msg) => {
    console.log(`[telegram-expenses] /start from ${msg.from.username} (${msg.from.id})`);
    if (!isAllowed(msg.from.id)) return;

    await bot.api.sendMessage({
      chat_id: msg.chat.id,
      text: [
        '🧾 Luku Safi Expense Bot',
        '',
        'Create:',
        '/expense Location | Category | Description | Amount | YYYY-MM-DD | TransactionCode(optional)',
        '',
        'Example:',
        '/expense Gitaru | Electricity | KPLC | 300 | 2026-09-07 | SGJ86T9BRQ',
        '',
        'Date is mandatory and must be YYYY-MM-DD.',
        'Transaction code is the only optional field.',
        '',
        '/recent - recent Telegram expenses',
        '/categories - valid categories',
      ].join('\n')
     })
  });

  bot.hears(/^\/categories(?:@\w+)?$/i, async (msg) => {
    if (!isAllowed(msg.from.id)) return;

    await bot.api.sendMessage({
      chat_id: msg.chat.id,
      text: `Valid categories:\n\n${CATEGORIES.map((category, index) => `${index + 1}. ${category}`).join('\n')}`
    })
  });

  bot.hears(/^\/expense(?:@\w+)?(?:\s+.*)?$/i, async (msg) => {
    if (!isAllowed(msg.from.id)) return;

    try {
      const expense = await parseExpenseMessage(msg.message.text);
      if (!expense) {
        return bot.api.sendMessage({
          chat_id: msg.chat.id,
          text: 'Use: /expense Location | Category | Description | Amount | YYYY-MM-DD | TransactionCode(optional)'
        });
      }

      // Store only until the user explicitly confirms.
      pendingCreates.set(String(msg.from.id), expense);

      await bot.api.sendMessage({
        chat_id: msg.chat.id,
        text:         [
          'Confirm this expense:',
          '',
          `📍 ${expense.location.display_name}`,
          `📂 ${expense.category}`,
          `📝 ${expense.description}`,
          `💰 ${money(expense.amount)}`,
          `📅 ${expense.date}`,
          `🔖 ${expense.transaction_code || 'No transaction code'}`,
        ].join('\n'),
        ...{
          reply_markup: {
            inline_keyboard: [[
              {
                text: '✅ Save',
                callback_data: 'expense:create:confirm',
              },
              {
                text: '❌ Cancel',
                callback_data: 'expense:create:cancel',
              },
            ]],
          },
        }
        });
    } catch (error) {
      await bot.api.sendMessage({chat_id: msg.chat.id, text: `❌ ${error.message}`});
    }
  });

  bot.hears(/^\/recent(?:@\w+)?$/i, async (msg) => {
    if (!isAllowed(msg.from.id)) return;

    try {
      // The database function itself only returns Telegram-created rows.
      const expenses = await getRecentExpenses(10);

      if (!expenses.length) {
        return bot.api.sendMessage({chat_id: msg.chat.id, text: 'No Telegram-created expenses yet.'});
      }

      const output = expenses
        .map(
          (expense, index) =>
            `${index + 1}. ${money(expense.amount)} — ${expense.category}\n` +
            `${expense.description}\n` +
            `${expense.location_name} • ${String(expense.date).slice(0, 10)}\n` +
            `ID: ${expense.id}`
        )
        .join('\n\n');

      await bot.api.sendMessage({chat_id: msg.chat.id, text: output});
    } catch (error) {
      await bot.api.sendMessage({chat_id: msg.chat.id, text: `❌ ${error.message}`});
    }
  });

  bot.hears(
    /^\/update(?:@\w+)?\s+([0-9a-f-]{36})\s+([a-z_]+)\s+(.+)$/i,
    async (msg, match) => {
      if (!isAllowed(msg.from.id)) return;

      const [, id, field, rawValue] = match;
      const value = rawValue.trim();
      const updates = {};

      try {
        switch (field.toLowerCase()) {
          case 'location': {
            const location = await resolveLocation(value);

            if (!location) {
              throw new Error(`Unknown or ambiguous location: ${value}`);
            }

            updates.location_id = location.id;
            break;
          }

          case 'category': {
            const category = resolveCategory(value);

            if (!category) {
              throw new Error(`Unknown or ambiguous category: ${value}`);
            }

            updates.category = category;
            break;
          }

          case 'description':
            updates.description = validateDescription(value);
            break;

          case 'amount':
            updates.amount = validateAmount(value);
            break;

          case 'date':
            updates.date = validateDate(value);
            break;

          case 'transaction_code':
            updates.transaction_code =
              ['none', 'null', 'remove', '-'].includes(value.toLowerCase())
                ? null
                : validateTransactionCode(value);
            break;

          default:
            throw new Error(
              'Editable fields: location, category, description, amount, date, transaction_code'
            );
        }

        // The DB API rejects updates to rows not originally created by Telegram.
        const updated = await updateExpense(id, updates);

        if (!updated) {
          return bot.api.sendMessage(
            {chat_id: msg.chat.id, text: '❌ Expense not found or not editable by Telegram.'}
          );
        }

        await bot.api.sendMessage(
          {chat_id: msg.chat.id, text: `✅ Updated.\n\n${formatExpense(updated)}`}
        );
      } catch (error) {
        await bot.api.sendMessage({chat_id: msg.chat.id, text: `❌ ${error.message}`});
      }
    }
  );

  bot.on('callback_query', async (query) => {
    console.log(`[telegram-expenses] callback_query from ${query.from.username} (${query.from.id}): ${query.data}`
    );
    if (!isAllowed(query.from.id)) return;
    const queryID = query.callbackQuery?.id;
    const key = String(query.from.id);
    const msg = query.message || query.callbackQuery?.message;
    console.log("CALLBACK QUERY", query.callbackQuery)

    if (query.callbackQuery?.data === 'expense:create:cancel') {
      pendingCreates.delete(key);
      await query.answerCallbackQuery();

      return bot.api.editMessageText({chat_id: msg.chat.id, message_id: msg.message_id, text: '❌ Expense cancelled.'});
    }

    if (query.callbackQuery?.data === 'expense:create:confirm') {
      const expense = pendingCreates.get(key);

      if (!expense) {
        return query.answerCallbackQuery({
          text: 'This pending expense expired. Send it again.',
          show_alert: true,
        });
      }

      try {
        const saved = await createExpense(expense);
        pendingCreates.delete(key);
        await query.answerCallbackQuery({
          text: 'Expense saved',
        });

        return bot.api.editMessageText({chat_id: msg.chat.id, message_id: msg.message_id, text: `✅ Expense saved.\n\n${formatExpense(saved)}`});
      } catch (error) {
        return query.answerCallbackQuery({
          text: error.message,
          show_alert: true,
        });
      }
    }
  });

  bot.on('polling_error', (error) => {
    console.error('[telegram-expenses] polling error:', error.message);
  });

  console.log('[telegram-expenses] Secure Telegram expense bot started.');
  return bot;
}

module.exports = {
  initTelegramExpenseBot,
};
