const readline = require('readline');


class Symptom {
    constructor(id, name, severity) {
        this.id = id;
        this.name = name;
        this.severity = severity; // 'слабая', 'умеренная', 'высокая'
    }
}

class Contraindication {
    constructor(id, name, category) {
        this.id = id;
        this.name = name;
        this.category = category; // 'хроническое_заболевание', 'физиологическое_состояние'
    }
}

class Drug {
    constructor(id, name, symptoms, contraindications, dosage, ageLimit) {
        this.id = id;
        this.name = name;
        this.symptoms = symptoms; // Массив ID симптомов
        this.contraindications = contraindications; // Массив ID противопоказаний
        this.dosage = dosage;
        this.ageLimit = ageLimit; // Минимальный возраст в годах
    }
}

const SYMPTOMS = {
    fever: new Symptom('fever', 'Высокая температура / Жар', 'умеренная'),
    headache: new Symptom('headache', 'Головная боль', 'слабая'),
    cough: new Symptom('cough', 'Кашель', 'слабая'),
    runny_nose: new Symptom('runny_nose', 'Насморк / Заложенность носа', 'слабая'),
    joint_pain: new Symptom('joint_pain', 'Боль в суставах', 'умеренная')
};

const CONTRAINDICATIONS = {
    ulcer: new Contraindication('ulcer', 'Язвенная болезнь желудка', 'хроническое_заболевание'),
    pregnancy: new Contraindication('pregnancy', 'Беременность', 'физиологическое_состояние'),
    liver_disease: new Contraindication('liver_disease', 'Печеночная недостаточность', 'хроническое_заболевание'),
    asthma: new Contraindication('asthma', 'Бронхиальная астма', 'хроническое_заболевание')
};

const KNOWLEDGE_BASE = [
    new Drug('paracetamol', 'Парацетамол', ['fever', 'headache'], ['liver_disease'], '1 таблетка (500 мг) каждые 4-6 часов', 6),
    new Drug('ibuprofen', 'Ибупрофен', ['fever', 'headache', 'joint_pain'], ['ulcer', 'asthma'], '1 таблетка (200-400 мг) после еды, до 3 раз в день', 12),
    new Drug('ambroxol', 'Амброксол', ['cough'], ['ulcer', 'pregnancy'], '1 таблетка (30 мг) 3 раза в день после еды', 12),
    new Drug('loratadine', 'Лоратадин', ['runny_nose'], ['pregnancy'], '1 таблетка (10 мг) 1 раз в сутки', 2)
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

async function runWizard() {
    console.log('====================================================');
    console.log(' ЭКСПЕРТНАЯ СИСТЕМА: КОНЦЕПЦИЯ А (МАСТЕР-ПОМОЩНИК) ');
    console.log('====================================================\n');

    const ageInput = await askQuestion('Шаг 1: Введите возраст пациента (лет): ');
    const patientAge = parseInt(ageInput, 10) || 18;

    console.log('\nШаг 2: Выберите симптомы (введите номера через запятую):');
    const symptomKeys = Object.keys(SYMPTOMS);
    symptomKeys.forEach((key, index) => {
        console.log(`  [${index + 1}] ${SYMPTOMS[key].name}`);
    });
    const symptomChoice = await askQuestion('Ваш выбор: ');
    const selectedSymptoms = symptomChoice
        .split(',')
        .map((num) => symptomKeys[parseInt(num.trim(), 10) - 1])
        .filter(Boolean);

    console.log('\nШаг 3: Выберите имеющиеся противопоказания (или нажмите Enter, если нет):');
    const contraKeys = Object.keys(CONTRAINDICATIONS);
    contraKeys.forEach((key, index) => {
        console.log(`  [${index + 1}] ${CONTRAINDICATIONS[key].name}`);
    });
    const contraChoice = await askQuestion('Ваш выбор: ');
    const selectedContra = contraChoice
        .split(',')
        .map((num) => contraKeys[parseInt(num.trim(), 10) - 1])
        .filter(Boolean);

    console.log('\n====================================================');
    console.log(' [ОТЛАДКА] ТРАССИРОВКА РАБОТЫ МЕХАНИЗМА ВЫВОДА ');
    console.log('====================================================');

    console.log(`\n[ОТЛАДКА] Входные данные пользователя:`);
    console.log(` - Возраст: ${patientAge} лет`);
    console.log(` - Выбранные симптомы: ${selectedSymptoms.map(s => SYMPTOMS[s].name).join(', ') || 'нет'}`);
    console.log(` - Выбранные противопоказания: ${selectedContra.map(c => CONTRAINDICATIONS[c].name).join(', ') || 'нет'}\n`);

    const recommended = [];
    const rejected = [];

    for (const drug of KNOWLEDGE_BASE) {
        console.log(`----------------------------------------------------`);
        console.log(`[ОТЛАДКА] Анализ препарата: "${drug.name}"`);

        const matchedSyms = drug.symptoms.filter((s) => selectedSymptoms.includes(s));
        if (matchedSyms.length === 0) {
            console.log(`  [Правило 1 - Отклонено] У пациента нет симптомов, подпадающих под показания препарата.`);
            continue;
        }
        console.log(`  [Правило 1 - Пройдено] Совпали симптомы: ${matchedSyms.map(s => SYMPTOMS[s].name).join(', ')}`);

        if (patientAge < drug.ageLimit) {
            const reason = `Возрастное ограничение (мин. возраст: ${drug.ageLimit} лет, пациенту: ${patientAge} лет)`;
            console.log(`  [Правило 2 - Отклонено] ${reason}`);
            rejected.push({ drug: drug.name, reason });
            continue;
        }
        console.log(`  [Правило 2 - Пройдено] Возраст пациента (${patientAge}) >= минимального (${drug.ageLimit})`);

        const matchedContra = drug.contraindications.filter((c) => selectedContra.includes(c));
        if (matchedContra.length > 0) {
            const contraNames = matchedContra.map((c) => CONTRAINDICATIONS[c].name).join(', ');
            const reason = `Обнаружено противопоказание: ${contraNames}`;
            console.log(`  [Правило 3 - Отклонено] ${reason}`);
            rejected.push({ drug: drug.name, reason });
            continue;
        }
        console.log(`  [Правило 3 - Пройдено] Противопоказаний не обнаружено.`);

        console.log(`  [ИТОГ] Препарат "${drug.name}" успешно рекомендован.`);
        recommended.push({
            drug: drug.name,
            dosage: drug.dosage,
            symptomsMatched: matchedSyms.map((s) => SYMPTOMS[s].name)
        });
    }

    console.log('\n====================================================');
    console.log(' РЕЗУЛЬТАТЫ ПОДБОРА ');
    console.log('====================================================\n');

    if (recommended.length > 0) {
        console.log(' РЕКОМЕНДОВАННЫЕ ПРЕПАРАТЫ:');
        recommended.forEach((item) => {
            console.log(`\n• Препарат: ${item.drug}`);
            console.log(`  Показание: купирует ${item.symptomsMatched.join(', ')}`);
            console.log(`  Режим дозирования: ${item.dosage}`);
        });
    } else {
        console.log(' Рекомендованные препараты не найдены.');
    }

    if (rejected.length > 0) {
        console.log('\n ИСКЛЮЧЕННЫЕ ПРЕПАРАТЫ И ПРИЧИНЫ:');
        rejected.forEach((item) => {
            console.log(`• ${item.drug} -> ОТКЛОНЕН: ${item.reason}`);
        });
    }

    console.log('\n====================================================');
    console.log('ВНИМАНИЕ: Данный прототип создан исключительно в учебных целях!');
    rl.close();
}

runWizard();