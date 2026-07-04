const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8961365984:AAFmWGgNf8IjhHxKBmUxNl3cuYX6cYOHl0Q';
const CHAT_ID = '5577770421';

// Файл для хранения био
const BIO_FILE = path.join(__dirname, 'bios.json');

// Функция чтения био
function readBios() {
    try {
        const data = fs.readFileSync(BIO_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Функция записи био
function writeBios(bios) {
    fs.writeFileSync(BIO_FILE, JSON.stringify(bios, null, 2));
}

// Функция отправки сообщения в Telegram
async function sendTelegram(text, keyboard = null) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = {
        chat_id: CHAT_ID,
        text: text,
        parse_mode: 'HTML'
    };
    if (keyboard) {
        body.reply_markup = JSON.stringify({
            inline_keyboard: keyboard
        });
    }
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

// --- ОБРАБОТКА КОМАНД ОТ ТЕЛЕГРАМ ---
app.post('/webhook', express.json(), async (req, res) => {
    const msg = req.body.message;
    if (!msg) return res.sendStatus(200);

    const text = msg.text || '';
    const chatId = msg.chat.id;

    // Проверяем, что сообщение от тебя
    if (chatId.toString() !== CHAT_ID) {
        await sendTelegram('⛔ Доступ запрещён. Ты не мой хозяин.');
        return res.sendStatus(200);
    }

    // --- КОМАНДА /menu ---
    if (text === '/menu' || text === 'Меню') {
        const keyboard = [
            [{ text: '📋 Список всех био', callback_data: 'list' }],
            [{ text: '👁️ Посмотреть био', callback_data: 'view' }],
            [{ text: '🗑️ Удалить био', callback_data: 'delete' }],
            [{ text: '📊 Статистика', callback_data: 'stats' }]
        ];
        await sendTelegram(
            '🚀 <b>AstroBio — Управление</b>\n\n' +
            'Выбери действие:',
            keyboard
        );
        return res.sendStatus(200);
    }

    // --- КОМАНДА /list ---
    if (text === '/list' || text === '📋 Список всех био') {
        const bios = readBios();
        const names = Object.keys(bios);
        if (names.length === 0) {
            await sendTelegram('📭 Пока нет ни одного био.');
        } else {
            let list = '📋 <b>Все био:</b>\n\n';
            names.forEach((name, i) => {
                const bio = bios[name];
                list += `${i+1}. <b>${name}</b> — 👁️ ${bio.views || 0} просмотров\n`;
            });
            list += `\nВсего: ${names.length} био`;
            await sendTelegram(list);
        }
        return res.sendStatus(200);
    }

    // --- КОМАНДА /stats ---
    if (text === '/stats' || text === '📊 Статистика') {
        const bios = readBios();
        const names = Object.keys(bios);
        let totalViews = 0;
        names.forEach(name => {
            totalViews += bios[name].views || 0;
        });
        await sendTelegram(
            '📊 <b>Статистика AstroBio</b>\n\n' +
            `📝 Всего био: ${names.length}\n` +
            `👁️ Всего просмотров: ${totalViews}\n` +
            `📅 Создано: ${new Date().toLocaleDateString()}`
        );
        return res.sendStatus(200);
    }

    // --- КОМАНДА /view ---
    if (text.startsWith('/view ')) {
        const name = text.replace('/view ', '').trim().toLowerCase();
        const bios = readBios();
        if (!bios[name]) {
            await sendTelegram(`❌ Био "${name}" не найдено.`);
            return res.sendStatus(200);
        }
        const bio = bios[name];
        let info = `👤 <b>${bio.username}</b>\n\n`;
        if (bio.description) info += `📝 ${bio.description}\n\n`;
        info += `📅 Создано: ${new Date(bio.createdAt).toLocaleDateString()}\n`;
        info += `👁️ Просмотров: ${bio.views || 0}\n`;
        info += `🔗 Ссылка: https://astrobio.onrender.com/?profile=${name}`;
        await sendTelegram(info);
        return res.sendStatus(200);
    }

    // --- КОМАНДА /delete ---
    if (text.startsWith('/delete ')) {
        const name = text.replace('/delete ', '').trim().toLowerCase();
        const bios = readBios();
        if (!bios[name]) {
            await sendTelegram(`❌ Био "${name}" не найдено.`);
            return res.sendStatus(200);
        }
        delete bios[name];
        writeBios(bios);
        await sendTelegram(`🗑️ Био "${name}" удалено!`);
        return res.sendStatus(200);
    }

    // --- НЕИЗВЕСТНАЯ КОМАНДА ---
    await sendTelegram(
        '❓ Неизвестная команда.\n\n' +
        'Доступные команды:\n' +
        '/menu — главное меню\n' +
        '/list — список всех био\n' +
        '/view ник — посмотреть био\n' +
        '/delete ник — удалить био\n' +
        '/stats — статистика'
    );

    res.sendStatus(200);
});

// --- ОБРАБОТКА НАЖАТИЙ НА КНОПКИ ---
app.post('/callback', express.json(), async (req, res) => {
    const callback = req.body.callback_query;
    if (!callback) return res.sendStatus(200);

    const data = callback.data;
    const chatId = callback.message.chat.id;

    if (chatId.toString() !== CHAT_ID) {
        return res.sendStatus(200);
    }

    if (data === 'list') {
        const bios = readBios();
        const names = Object.keys(bios);
        if (names.length === 0) {
            await sendTelegram('📭 Пока нет ни одного био.');
        } else {
            let list = '📋 <b>Все био:</b>\n\n';
            names.forEach((name, i) => {
                const bio = bios[name];
                list += `${i+1}. <b>${name}</b> — 👁️ ${bio.views || 0} просмотров\n`;
            });
            list += `\nВсего: ${names.length} био`;
            await sendTelegram(list);
        }
    } else if (data === 'stats') {
        const bios = readBios();
        const names = Object.keys(bios);
        let totalViews = 0;
        names.forEach(name => {
            totalViews += bios[name].views || 0;
        });
        await sendTelegram(
            '📊 <b>Статистика AstroBio</b>\n\n' +
            `📝 Всего био: ${names.length}\n` +
            `👁️ Всего просмотров: ${totalViews}\n` +
            `📅 Создано: ${new Date().toLocaleDateString()}`
        );
    } else if (data === 'view') {
        await sendTelegram(
            '👁️ Введи ник для просмотра:\n' +
            '/view ник'
        );
    } else if (data === 'delete') {
        await sendTelegram(
            '🗑️ Введи ник для удаления:\n' +
            '/delete ник'
        );
    }

    res.sendStatus(200);
});

// --- РАЗДАЧА HTML-САЙТА ---
app.use(express.static('.'));

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
