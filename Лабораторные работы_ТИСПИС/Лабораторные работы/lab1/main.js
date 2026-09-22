const readline = require('readline');

const KNOWLEDGE_BASE = [
    {
        name: 'Парацетамол',
        symptoms: ['температура', 'головная боль'],
        contraindications: ['печеночная недостаточность', 'алкоголизм'],
        dosage: '1 таблетка (500 мг) при повышении температуры, не более 4 раз в сутки.'
    },
    {
        name: 'Ибупрофен',
        symptoms: ['температура', 'головная боль', 'зубная боль', 'боль в суставах'],
        contraindications: ['язвенная болезнь', 'аспириновая астма', 'почечная недостаточность'],
        dosage: '1 таблетка (200-400 мг) после еды, до 3 раз в сутки.'
    },
    {
        name: 'Лоратадин',
        symptoms: ['насморк', 'зуд', 'аллергия'],
        contraindications: ['беременность', 'лактация'],
        dosage: '1 таблетка (10 мг) 1 раз в сутки.'
    },
    {
        name: 'Амброксол',
        symptoms: ['кашель'],
        contraindications: ['язвенная болезнь', 'первый триместр беременности'],
        dosage: '1 таблетка (30 мг) 3 раза в день после еды.'
    }
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
    console.log('====================================================');
    console.log(' ЭКСПЕРТНАЯ СИСТЕМА ПОДБОРА ЛЕКАРСТВЕННЫХ ПРЕПАРАТОВ');
    console.log('====================================================\n');

    const inputSymptoms = await askQuestion(
        'Введите симптомы через запятую (например: температура, головная боль): '
    );
    const userSymptoms = inputSymptoms
        .toLowerCase()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const inputContra = await askQuestion(
        'Введите имеющиеся противопоказания/заболевания (или нажмите Enter, если нет): '
    );
    const userContra = inputContra
        .toLowerCase()
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

    console.log('\n Обработка данных экспертной системой...\n');

    const recommended = [];
    const rejected = [];

    for (const med of KNOWLEDGE_BASE) {
        const matchedSymptoms = med.symptoms.filter((s) => userSymptoms.includes(s));

        if (matchedSymptoms.length > 0) {
            const matchedContra = med.contraindications.filter((c) => userContra.includes(c));

            if (matchedContra.length > 0) {
                rejected.push({ med: med.name, reason: matchedContra.join(', ') });
            } else {
                recommended.push({ med: med.name, dosage: med.dosage, matched: matchedSymptoms });
            }
        }
    }

    console.log('--- РЕЗУЛЬТАТ ПОДБОРА ---');
    if (recommended.length === 0) {
        console.log('Рекомендованные препараты не найдены. Обратитесь к врачу!');
    } else {
        console.log('Рекомендованные препараты:');
        recommended.forEach((item) => {
            console.log(`\n• Препарат: ${item.med}`);
            console.log(`  Купирует симптомы: ${item.matched.join(', ')}`);
            console.log(`  Рекомендуемая дозировка: ${item.dosage}`);
        });
    }

    if (rejected.length > 0) {
        console.log('\n Исключенные препараты (из-за противопоказаний):');
        rejected.forEach((item) => {
            console.log(`• ${item.med} — противопоказание: ${item.reason}`);
        });
    }

    console.log('\n ВНИМАНИЕ: Данный прототип не заменяет консультацию профессионального врача!');
    rl.close();
}

main();