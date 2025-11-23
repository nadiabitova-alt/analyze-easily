// --- Глобальные переменные для управления графиками ---
let weibullChartInstance;
let monteCarloChartInstance;

// --- Вспомогательные функции для распределения Вейбулла ---
function weibullPdf(x, k, lambda) {
    if (lambda <= 0 || k <= 0 || x < 0) return NaN;
    if (x === 0 && k < 1) return Infinity; // Обработка особых случаев для PDF
    if (x === 0 && k === 1) return 1/lambda;
    if (x === 0 && k > 1) return 0;
    return (k / lambda) * Math.pow(x / lambda, k - 1) * Math.exp(-Math.pow(x / lambda, k));
}

function weibullCdf(x, k, lambda) {
    if (lambda <= 0 || k <= 0 || x < 0) return NaN;
    return 1 - Math.exp(-Math.pow(x / lambda, k));
}

function weibullSf(x, k, lambda){
    if (lambda <= 0 || k <= 0 || x < 0) return NaN;
    return Math.exp(-Math.pow(x / lambda, k));
}

// --- Функция для генерации случайных чисел Вейбулла (для Монте-Карло) ---
function inverseWeibull(k, lambda, uniform){
    if (lambda <= 0 || k <= 0 || uniform <= 0 || uniform >= 1) return NaN;
    return lambda * Math.pow(-Math.log(1 - uniform), 1 / k);
}

// --- Обработчик события для кнопки "Рассчитать" (PDF/CDF/SF) ---
document.getElementById('calculate-button').addEventListener('click', function() {
    const k = parseFloat(document.getElementById('shape-param').value);
    const lambda = parseFloat(document.getElementById('scale-param').value);
    const xInput = document.getElementById('x-value').value;
    const calculationType = document.getElementById('calculation-type').value;

    // Валидация параметров k и lambda
    if (isNaN(k) || k <= 0) {
        document.getElementById('result-text').textContent = "Необходимо ввести корректное положительное значение для параметра формы (k)";
        return;
    }
    if (isNaN(lambda) || lambda <= 0) {
        document.getElementById('result-text').textContent = "Необходимо ввести корректное положительное значение для параметра масштаба (lambda)";
        return;
    }

    // Валидация значения x
    const x = parseFloat(xInput);
    const isXValidNumber = !isNaN(x) && x >= 0;
    let result;

    // --- Расчет одного значения ---
    if (calculationType === 'pdf') {
        if (!isXValidNumber) {
            document.getElementById('result-text').textContent = "Для расчета PDF необходимо ввести корректное неотрицательное значение X.";
            return;
        }
        result = weibullPdf(x, k, lambda);
    } else if (calculationType === 'cdf') {
        if (!isXValidNumber) {
            document.getElementById('result-text').textContent = "Для расчета CDF необходимо ввести корректное неотрицательное значение X.";
            return;
        }
        result = weibullCdf(x, k, lambda);
    } else if (calculationType === 'sf') {
        if (!isXValidNumber) {
            document.getElementById('result-text').textContent = "Для расчета SF необходимо ввести корректное неотрицательное значение X.";
            return;
        }
        result = weibullSf(x, k, lambda);
    } else {
        document.getElementById('result-text').textContent = "Выберите тип расчета (PDF, CDF или SF).";
        return;
    }

    // Вывод результата одного расчета
    if (!isNaN(result) && isFinite(result)) {
        document.getElementById('result-text').textContent = `Результат: ${result.toFixed(6)}`;
    } else if (result === Infinity) {
        document.getElementById('result-text').textContent = `Результат: ∞ (бесконечность)`;
    }
    else {
        document.getElementById('result-text').textContent = "Ошибка при расчете. Проверьте входные данные.";
    }

    // --- Создание или обновление графика Вейбулла ---
    const canvas = document.getElementById("weibullChart");
    const ctx = canvas.getContext("2d");

    const points = 100;
    // Диапазон для графика. Для PDF может потребоваться более узкий диапазон, для CDF/SF - более широкий.
    // Здесь используется адаптивный диапазон.
    let rangeMaxX = lambda * 3; // Начальный диапазон
    if (k < 1) rangeMaxX = lambda * 5; // Для k < 1 функция может иметь пик вначале
    if (k > 1) rangeMaxX = lambda * 5; // Для k > 1 хвост может быть длиннее
    if (k > 2) rangeMaxX = lambda * 5;

    const range = Math.max(rangeMaxX, 5); // Устанавливаем минимальный диапазон, если lambda мала
    const step = range / points;

    const chartLabels = [];
    const chartData = [];
    let yMaxValue = 0;

    for (let i = 0; i < points; i++) {
        const currentX = i * step;
        let yValue;

        if (calculationType === 'pdf') {
            yValue = weibullPdf(currentX, k, lambda);
        } else if (calculationType === 'cdf') {
            yValue = weibullCdf(currentX, k, lambda);
        } else { // Default to SF
            yValue = weibullSf(currentX, k, lambda);
        }

        if (!isNaN(yValue) && isFinite(yValue) && yValue > -1e-9) {
            chartLabels.push(currentX.toFixed(2));
            chartData.push(yValue);
            if (yValue > yMaxValue) {
                yMaxValue = yValue;
            }
        } else {
            chartLabels.push(currentX.toFixed(2));
            chartData.push(null); // Разрыв на графике
        }
    }

    // --- Управление экземпляром графика ---
    if (weibullChartInstance) {
        weibullChartInstance.data.labels = chartLabels;
        weibullChartInstance.data.datasets[0].data = chartData;
        weibullChartInstance.data.datasets[0].label = `Weibull (${calculationType.toUpperCase()}, k=${k.toFixed(2)}, λ=${lambda.toFixed(2)})`;
        weibullChartInstance.options.scales.y.max = yMaxValue * 1.1;
        weibullChartInstance.options.plugins.title.text = `Распределение Вейбулла: ${calculationType.toUpperCase()}`;
        weibullChartInstance.update();
    } else {
        weibullChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: chartLabels,
                datasets: [{
                    label: `Weibull (${calculationType.toUpperCase()}, k=${k.toFixed(2)}, λ=${lambda.toFixed(2)})`,
                    data: chartData,
                    borderColor: "rgb(75, 192, 192)",
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: {
                        title: { display: true, text: 'Значение x' },
                        min: 0
                    },
                    y: {
                        title: { display: true, text: 'Значение функции' },
                        max: yMaxValue * 1.1
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Распределение Вейбулла: ${calculationType.toUpperCase()}`
                    }
                }
            }
        });
    }
});

// --- Обработчик события для кнопки "Очистить" ---
document.getElementById('clear-button').addEventListener('click', function(){
    document.getElementById('shape-param').value = '1';
    document.getElementById('scale-param').value = '1';
    document.getElementById('x-value').value = '';
    document.getElementById('result-text').textContent = '';
    document.getElementById('monte-carlo-samples').value = '1000';
    document.getElementById('monte-carlo-text').textContent = '';

    // Очистка первого графика
    if (weibullChartInstance) {
        weibullChartInstance.data.labels = [];
        weibullChartInstance.data.datasets[0].data = [];
        weibullChartInstance.options.plugins.title.text = 'График функции Вейбулла';
        weibullChartInstance.options.scales.y.max = undefined; // Сброс масштаба
        weibullChartInstance.update();
    }
    
    // Очистка графика Монте-Карло
    if (monteCarloChartInstance) {
        monteCarloChartInstance.data.labels = [];
        monteCarloChartInstance.data.datasets[0].data = [];
        monteCarloChartInstance.options.plugins.title.text = 'Гистограмма Монте-Карло';
        monteCarloChartInstance.update();
    }
});

// --- Обработчик события для кнопки "Монте-Карло" ---
document.getElementById('monte-carlo-button').addEventListener('click', function() {
   const k = parseFloat(document.getElementById('shape-param').value);
   const lambda = parseFloat(document.getElementById('scale-param').value);
   const numSamples = parseInt(document.getElementById('monte-carlo-samples').value);

   // Валидация параметров
   if (isNaN(k) || k <= 0) {
        document.getElementById('monte-carlo-text').textContent = "Необходимо ввести корректное положительное значение для параметра формы (k)";
        if (monteCarloChartInstance) {
            monteCarloChartInstance.destroy();
            monteCarloChartInstance = null;
        }
       return;
    }
    if (isNaN(lambda) || lambda <= 0) {
        document.getElementById('monte-carlo-text').textContent = "Необходимо ввести корректное положительное значение для параметра масштаба (lambda)";
        if (monteCarloChartInstance) {
            monteCarloChartInstance.destroy();
            monteCarloChartInstance = null;
        }
       return;
    }
    if (isNaN(numSamples) || numSamples <= 0) {
        document.getElementById('monte-carlo-text').textContent = "Необходимо ввести корректное положительное количество выборок.";
        if (monteCarloChartInstance) {
            monteCarloChartInstance.destroy();
            monteCarloChartInstance = null;
        }
       return;
    }
  
    // Генерация выборок
    const samples = [];
    for (let i = 0; i < numSamples; i++) {
         const uniform = Math.random();
         const sample = inverseWeibull(k, lambda, uniform);
         if (!isNaN(sample) && isFinite(sample) && sample >= 0) { // Добавляем только валидные неотрицательные выборки
            samples.push(sample);
         } else {
             // console.warn(`Пропущена некорректная или отрицательная выборка на итерации ${i}: ${sample}`);
         }
    }

    // Если выборок нет
    if (samples.length === 0) {
        document.getElementById('monte-carlo-text').textContent = "Не удалось сгенерировать ни одной корректной неотрицательной выборки.";
        if (monteCarloChartInstance) {
            monteCarloChartInstance.destroy();
            monteCarloChartInstance = null;
        }
        return;
    }

    // Расчет статистики
    const average = samples.reduce((a, b) => a + b, 0) / samples.length;
    // Выборочное стандартное отклонение
    const standardDeviation = (samples.length > 1)
        ? Math.sqrt(samples.reduce((a,b) => a + Math.pow(b-average,2),0) / (samples.length - 1))
        : 0;
     
   document.getElementById('monte-carlo-text').textContent = `Среднее: ${average.toFixed(4)}, Стандартное отклонение: ${standardDeviation.toFixed(4)}`;
   
   // --- Генерация данных для гистограммы ---
    // Попытка определить размер корзины более интеллектуально
    let binSize;
    if (samples.length < 100) {
        binSize = 1; // Для малого числа выборок фиксируем
    } else {
        // Правило Стерджеса для оценки количества корзин, затем вычисляем размер
        const nBins = Math.ceil(1 + 3.322 * Math.log(samples.length));
        binSize = Math.max(0.1, (Math.max(...samples) - Math.min(...samples)) / nBins); // Минимальный binSize
    }
    if (binSize === 0) binSize = 1; // Предотвращаем деление на ноль, если все значения одинаковы

    const max = Math.max(...samples);
    const min = Math.min(...samples);
    
    const effectiveMin = 0; // Для большинства распределений Вейбулла x >= 0
    const effectiveMax = max; // Максимальное значение выборки
    const numberOfBins = Math.max(1, Math.ceil((effectiveMax - effectiveMin) / binSize));

    const histogram = new Array(numberOfBins).fill(0);
    const binLabels = []; 

    // Заполнение гистограммы
    samples.forEach(value => {
       const binIndex = Math.floor((value - effectiveMin) / binSize);
       if (binIndex >= 0 && binIndex < numberOfBins) {
           histogram[binIndex]++;
       }
    });

    // Генерация меток для корзин гистограммы
    for(let i = 0; i < numberOfBins; i++){
        const binStart = effectiveMin + i * binSize;
        const binEnd = binStart + binSize;
        binLabels.push(`${binStart.toFixed(1)} - ${binEnd.toFixed(1)}`);
    }
    
    // --- Создание или обновление графика гистограммы Монте-Карло ---
    const mcCanvas = document.getElementById("monteCarloChart");
    const mcCtx = mcCanvas.getContext("2d");
    
    if (monteCarloChartInstance) {
        monteCarloChartInstance.destroy();
    }

    monteCarloChartInstance = new Chart(mcCtx, {
        type: "bar",
        data: {
            labels: binLabels,
            datasets: [{
               label: 'Частота',
               data: histogram,
               backgroundColor: 'rgba(54, 162, 235, 0.8)',
               borderColor: 'rgba(54, 162, 235, 1)',
               borderWidth: 1
            }]
        },
        options: {
            scales: {
                x:{
                    title:{
                        display: true,
                        text: "Значение выборки"
                    },
                    min: effectiveMin
                },
                y:{
                   title: {
                       display: true,
                       text: "Количество"
                   },
                   beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Гистограмма Монте-Карло (k=${k.toFixed(2)}, λ=${lambda.toFixed(2)}, N=${numSamples})`
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y + ' раз(а)';
                            }
                            return label;
                        }
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
});
