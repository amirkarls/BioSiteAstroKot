const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// ТВОИ ДАННЫЕ
const BOT_TOKEN = '8961365984:AAFmWGgNf8IjhHxKBmUxNl3cuYX6cYOHl0Q';
const CHAT_ID = '5577770421';

// --- НАСТРОЙКА СЕРВЕРА ---
app.use(express.json()); // Учим сервер понимать JSON от Telegram

// Главная страница для проверки
app.get('/', (req, res) => {
    res.send('🚀 AstroBio сервер работает!');
});

// ----- ЭТО ГЛАВНЫЙ WEBHOOK -----
app.post('/webhook', async (req, res) => {
    // Сразу отвечаем Telegram, что всё ок, чтобы он не переспрашивал
    res.sendStatus(200);

    try {
        const msg = req.body.message;
        if (!msg) return;

        const text = msg.text || '';
        const chatId = msg.chat.id;

        // Проверяем, что команда пришла от ТЕБЯ
        if (chatId.toString() !== CHAT_ID) {
            await sendTelegram('⛔ Доступ запрещён.');
            return;
        }

        // --- ОБРАБОТКА КОМАНД ---
        if (text === '/menu' || text === 'Меню') {
            await sendTelegram(
                '🚀 <b>AstroBio — Управление</b>\n\n' +
                '/list — список всех био\n' +
                '/view ник — посмотреть био\n' +
                '/delete ник — удалить био\n' +
                '/stats — статистика\n\n' +
                '⬆️ Просто напиши команду'
            );
        }
        else if (text === '/list') {
            const bios = readBios();
            const names = Object.keys(bios);
            if (names.length === 0) {
                await sendTelegram('📭 Пока нет ни одного био.');
            } else {
                let list = '📋 <b>Все био:</b>\n\n';
                names.forEach((name, i) => {
                    list += `${i+1}. <b>${name}</b> — 👁️ ${bios[name].views || 0} просмотров\n`;
                });
                list += `\nВсего: ${names.length} био`;
                await sendTelegram(list);
            }
        }
        else if (text === '/stats') {
            const bios = readBios();
            const names = Object.keys(bios);
            let totalViews = 0;
            names.forEach(name => { totalViews += bios[name].views || 0; });
            await sendTelegram(
                '📊 <b>Статистика</b>\n\n' +
                `📝 Всего био: ${names.length}\n` +
                `👁️ Всего просмотров: ${totalViews}`
            );
        }
        else if (text.startsWith('/view ')) {
            const name = text.replace('/view ', '').trim().toLowerCase();
            const bios = readBios();
            if (!bios[name]) {
                await sendTelegram(`❌ Био "${name}" не найдено.`);
            } else {
                const bio = bios[name];
                let info = `👤 <b>${bio.username}</b>\n\n`;
                if (bio.description) info += `📝 ${bio.description}\n\n`;
                info += `📅 ${new Date(bio.createdAt).toLocaleDateString()}\n`;
                info += `👁️ ${bio.views || 0} просмотров\n`;
                info += `🔗 https://astrobio.onrender.com/?profile=${name}`;
                await sendTelegram(info);
            }
        }
        else if (text.startsWith('/delete ')) {
            const name = text.replace('/delete ', '').trim().toLowerCase();
            const bios = readBios();
            if (!bios[name]) {
                await sendTelegram(`❌ Био "${name}" не найдено.`);
            } else {
                delete bios[name];
                writeBios(bios);
                await sendTelegram(`🗑️ Био "${name}" удалено!`);
            }
        }
        else {
            await sendTelegram(
                '❓ Неизвестная команда.\n\n' +
                'Доступные команды:\n' +
                '/menu — главное меню\n' +
                '/list — список всех био\n' +
                '/view ник — посмотреть био\n' +
                '/delete ник — удалить био\n' +
                '/stats — статистика'
            );
        }
    } catch (err) {
        console.error('Ошибка при обработке:', err);
    }
});

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const BIO_FILE = path.join(__dirname, 'bios.json');

function readBios() {
    try { return JSON.parse(fs.readFileSync(BIO_FILE, 'utf8')); }
    catch { return {}; }
}

function writeBios(bios) {
    fs.writeFileSync(BIO_FILE, JSON.stringify(bios, null, 2));
}

async function sendTelegram(text) {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            })
        });
    } catch (err) {
        console.error('Ошибка отправки:', err);
    }
}

// --- ЗАПУСК ---
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
