// ======================================
// ECOFIX - CALCULADORA DE ECONOMIA (v2)
// ======================================

// Preços fictícios para demonstração (substituir por dados reais validados)
const modelosConvencionais = [0.80, 1.20];
const modelosReutilizaveis = [3.50, 5.00];

// Elementos da página
const cadastro = document.querySelector(".cadastro");
const campos = cadastro.querySelectorAll("input");
const seletores = cadastro.querySelectorAll("select");
const botao = cadastro.querySelector("button");

const indicadores = document.querySelectorAll(
    ".indicadores .card p"
);

const listaLocais = document.querySelector(".locais");

// Configurações iniciais
let producaoDiaria = 30;
let diasMes = 22;
let mesesAno = 12;

let substituicoes = [];

// Identificação dos dados salvos
const CHAVE_ECOFIX = "ecofix_dados_v1";

// Recuperar dados anteriores
function carregarDados() {
    try {
        const dados = JSON.parse(
            localStorage.getItem(CHAVE_ECOFIX)
        );

        if (dados) {
            substituicoes = dados.substituicoes || [];
            producaoDiaria = dados.producaoDiaria ?? 30;
            diasMes = dados.diasMes ?? 22;
            mesesAno = dados.mesesAno ?? 12;
        }
    } catch (erro) {
        console.log("Erro ao recuperar dados:", erro);
    }
}

// Salvar informações automaticamente
function salvarDados() {
    const dados = {
        substituicoes,
        producaoDiaria,
        diasMes,
        mesesAno
    };

    try {
        localStorage.setItem(
            CHAVE_ECOFIX,
            JSON.stringify(dados)
        );
    } catch (erro) {
        console.log("Não foi possível salvar os dados:", erro);
    }
}

// Carregar informações ao abrir o site
carregarDados();


// Criar campo de ciclos de reutilização
const labelCiclos = document.createElement("label");
labelCiclos.textContent = "Ciclos estimados de reutilização";

const campoCiclos = document.createElement("input");
campoCiclos.type = "number";
campoCiclos.min = "1";
campoCiclos.value = "20";

labelCiclos.appendChild(campoCiclos);
cadastro.insertBefore(labelCiclos, botao);

// Criar campo de produção diária
const configuracao = document.createElement("section");
configuracao.className = "cadastro";

configuracao.innerHTML = `
    <h2>Produção</h2>

    <label>Caminhões produzidos por dia</label>
    <input id="producao" type="number"
        min="0" step="1" value="30">

    <label>Dias produtivos por mês</label>
    <input id="diasMes" type="number"
        min="0" max="31" step="1" value="22">

    <label>Meses produtivos por ano</label>
    <input id="mesesAno" type="number"
        min="0" max="12" step="1" value="12">
`;

cadastro.parentNode.insertBefore(configuracao, cadastro);
configuracao.querySelector("#producao").value = producaoDiaria;
configuracao.querySelector("#diasMes").value = diasMes;
configuracao.querySelector("#mesesAno").value = mesesAno;

// Criar botão de exportação
const botaoExportar = document.createElement("button");
botaoExportar.textContent = "Exportar planilha CSV";
botaoExportar.type = "button";

cadastro.appendChild(botaoExportar);

// Criar seção de análise complementar (logo após os indicadores)
const analise = document.createElement("section");
analise.className = "analise";

const blocoIndicadores = document.querySelector(".indicadores");
blocoIndicadores.parentNode.insertBefore(
    analise,
    blocoIndicadores.nextSibling
);

// Criar seção de gráficos (logo após a análise complementar)
const graficos = document.createElement("section");
graficos.className = "graficos";
graficos.hidden = true;
graficos.innerHTML = `
    <h2>Gráficos</h2>
    <div class="grafico"><canvas id="graficoCustos"></canvas></div>
    <div class="grafico"><canvas id="graficoProjecao"></canvas></div>
    <div class="grafico" id="blocoDivisao"><canvas id="graficoDivisao"></canvas></div>
    <div class="grafico"><canvas id="graficoEquilibrio"></canvas></div>
`;
analise.parentNode.insertBefore(graficos, analise.nextSibling);

// Formatação em reais
function formatarDinheiro(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ----- Cálculos -----

// Custo convencional evitado por caminhão
function custoConvencional(item) {
    return item.quantidade * item.precoConvencional;
}

// Custo amortizado da reutilizável por caminhão
function custoAmortizado(item, ciclos = item.ciclos) {
    return item.quantidade * (item.precoReutilizavel / ciclos);
}

// Economia estimada por caminhão
function calcularEconomia(item, ciclos = item.ciclos) {
    return custoConvencional(item) - custoAmortizado(item, ciclos);
}

// Investimento inicial (quantidade × preço reutilizável)
function investimentoInicial(item) {
    return item.quantidade * item.precoReutilizavel;
}

// Ciclos mínimos para a reutilizável empatar com a convencional
function ciclosEquilibrio(item) {
    return item.precoReutilizavel / item.precoConvencional;
}

// Quantidade inteira mínima para gerar economia positiva
function ciclosMinimosEconomia(item) {
    return Math.floor(ciclosEquilibrio(item)) + 1;
}

// Economia anual para um fator aplicado aos ciclos (cenários)
function economiaAnualCenario(fator) {
    const porCaminhao = substituicoes.reduce(
        (total, item) => {
            const ciclos = Math.max(1, Math.round(item.ciclos * fator));
            return total + calcularEconomia(item, ciclos);
        },
        0
    );

    return porCaminhao * producaoDiaria * diasMes * mesesAno;
}

// Atualizar análise complementar
function atualizarAnalise() {
    analise.innerHTML = "<h2>Análise complementar</h2>";

    if (substituicoes.length === 0) {
        return;
    }

    const investimento = substituicoes.reduce(
        (total, item) => total + investimentoInicial(item),
        0
    );

    const linhas = [
        ["Investimento inicial por caminhão", formatarDinheiro(investimento)],
        ["Cenário conservador (50% dos ciclos)", formatarDinheiro(economiaAnualCenario(0.5)) + "/ano"],
        ["Cenário informado (100% dos ciclos)", formatarDinheiro(economiaAnualCenario(1)) + "/ano"],
        ["Cenário otimista (150% dos ciclos)", formatarDinheiro(economiaAnualCenario(1.5)) + "/ano"]
    ];

    linhas.forEach(([rotulo, valor]) => {
        const p = document.createElement("p");
        p.textContent = rotulo + ": " + valor;
        analise.appendChild(p);
    });

    const aviso = document.createElement("small");
    aviso.textContent =
        "Valores estimados com preços fictícios de teste. " +
        "Não representam economia líquida comprovada: custos de " +
        "inspeção, limpeza e recuperação ainda não foram considerados.";
    analise.appendChild(aviso);
}

// ----- Gráficos (Chart.js carregado sob demanda) -----

let chartCarregando = null;

function carregarChartJs() {
    if (window.Chart) {
        return Promise.resolve(true);
    }

    if (!chartCarregando) {
        chartCarregando = new Promise(resolve => {
            const script = document.createElement("script");
            script.src =
                "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
            script.onload = () => resolve(true);
            script.onerror = () => {
                chartCarregando = null;
                resolve(false);
            };
            document.head.appendChild(script);
        });
    }

    return chartCarregando;
}

// Economia mensal para um fator aplicado aos ciclos
function economiaMensalCenario(fator) {
    const porCaminhao = substituicoes.reduce(
        (total, item) => {
            const ciclos = Math.max(1, Math.round(item.ciclos * fator));
            return total + calcularEconomia(item, ciclos);
        },
        0
    );

    return porCaminhao * producaoDiaria * diasMes;
}

let graficoCustos = null;
let graficoProjecao = null;
let graficoDivisao = null;
let graficoEquilibrio = null;


const coresLocais = [
    "#001E50",
    "#005B9A",
    "#287DB5",
    "#80B9E0",
    "#A9CDE8",
    "#456A91",
    "#6F8EAE",
    "#C5D9EA"
];


const opcoesBase = {
    responsive: true,
    animation: false,
    color: "#001E50",
    plugins: {
        legend: {
            labels: {
                color: "#001E50",
                usePointStyle: true,
                padding: 18
            }
        }
    },
    scales: {
        x: {
            ticks: {
                color: "#66778B"
            },
            grid: {
                color: "#EAF0F6"
            }
        },
        y: {
            ticks: {
                color: "#66778B",
                callback: valor => formatarDinheiro(valor)
            },
            grid: {
                color: "#D9E3ED"
            }
        }
    }
};




function opcoesComTitulo(titulo) {
    return {
        ...opcoesBase,
        plugins: {
            title: { display: true, text: titulo },
            tooltip: {
                callbacks: {
                    label: contexto =>
                        contexto.dataset.label + ": " +
                        formatarDinheiro(contexto.parsed.y)
                }
            }
        }
    };
}

async function atualizarGraficos() {
    if (substituicoes.length === 0) {
        graficos.hidden = true;
        return;
    }

    const carregou = await carregarChartJs();

    if (!carregou) {
        graficos.hidden = true;
        return;
    }

    // Lê o estado atual (pode ter mudado durante o carregamento)
    graficos.hidden = substituicoes.length === 0;

    if (substituicoes.length === 0) {
        return;
    }

    if (graficoCustos) graficoCustos.destroy();
    if (graficoProjecao) graficoProjecao.destroy();
    if (graficoDivisao) graficoDivisao.destroy();
    if (graficoEquilibrio) graficoEquilibrio.destroy();
    graficoDivisao = null;

    // Gráfico 1: custo por caminhão em cada local
    graficoCustos = new Chart(
        document.querySelector("#graficoCustos"),
        {
            type: "bar",
            data: {
                labels: substituicoes.map(item => item.local),
                datasets: [
                    {
                        label: "Convencional (custo evitado)",
                        data: substituicoes.map(custoConvencional),
                        
backgroundColor: "#80B9E0"

                    },
                    {
                        label: "Reutilizável (custo amortizado)",
                        data: substituicoes.map(item => custoAmortizado(item)),
                       
backgroundColor: "#005B9A"

                    }
                ]
            },
            options: opcoesComTitulo(
                "Custo por caminhão em cada local (estimativa)"
            )
        }
    );

    // Gráfico 2: economia acumulada ao longo do ano, por cenário
    const meses = [];
    for (let m = 1; m <= mesesAno; m++) {
        meses.push("Mês " + m);
    }

    
const cenarios = [
    ["Conservador (50% dos ciclos)", 0.5, "#80B9E0"],
    ["Informado (100% dos ciclos)", 1, "#005B9A"],
    ["Otimista (150% dos ciclos)", 1.5, "#001E50"]
];


    graficoProjecao = new Chart(
        document.querySelector("#graficoProjecao"),
        {
            type: "line",
            data: {
                labels: meses,
                datasets: cenarios.map(([nome, fator, cor]) => {
                    const mensal = economiaMensalCenario(fator);

                    return {
                        label: nome,
                        data: meses.map((_, i) => mensal * (i + 1)),
                        borderColor: cor,
                        backgroundColor: cor,
                        tension: 0.2
                    };
                })
            },
            options: opcoesComTitulo(
                "Economia acumulada no ano (estimativa)"
            )
        }
    );

    // Gráfico 3: divisão da economia por local (somente locais com economia positiva)
    const comEconomia = substituicoes.filter(
        item => calcularEconomia(item) > 0
    );

    const blocoDivisao = document.querySelector("#blocoDivisao");
    blocoDivisao.hidden = comEconomia.length === 0;

    if (comEconomia.length > 0) {
        graficoDivisao = new Chart(
            document.querySelector("#graficoDivisao"),
            {
                type: "doughnut",
                data: {
                    labels: comEconomia.map(item => item.local),
                    datasets: [{
                        data: comEconomia.map(item => calcularEconomia(item)),
                        backgroundColor: comEconomia.map(
                            (_, i) => coresLocais[i % coresLocais.length]
                        )
                    }]
                },
               
options: {
    responsive: true,
    animation: false,
    plugins: {
        title: {
            display: true,
            text: "Divisão da economia por local (estimativa)",
            color: "#001E50"
        },
        tooltip: {
            callbacks: {
                label: contexto =>
                    contexto.label + ": " +
                    formatarDinheiro(contexto.parsed)
            }
        },
        legend: {
            labels: {
                color: "#001E50"
            }
        }
    }
}

            }
        );
    }

    // Gráfico 4: ponto de equilíbrio (economia por caminhão x ciclos)
    const maiorCiclo = Math.max(...substituicoes.map(item => item.ciclos));
    const maiorEquilibrio = Math.max(
        ...substituicoes.map(item => ciclosEquilibrio(item))
    );

    const limiteCiclos = Math.min(
        200,
        Math.max(10, maiorCiclo * 2, Math.ceil(maiorEquilibrio * 2))
    );

    const ciclosEixo = [];
    for (let c = 1; c <= limiteCiclos; c++) {
        ciclosEixo.push(c);
    }

    graficoEquilibrio = new Chart(
        document.querySelector("#graficoEquilibrio"),
        {
            type: "line",
            data: {
                labels: ciclosEixo,
                datasets: substituicoes.map((item, i) => ({
                    label: item.local,
                    data: ciclosEixo.map(c => calcularEconomia(item, c)),
                    borderColor: coresLocais[i % coresLocais.length],
                    backgroundColor: coresLocais[i % coresLocais.length],
                    pointRadius: 0,
                    tension: 0.2
                }))
            },
            options: {
                ...opcoesComTitulo(
                    "Ponto de equilíbrio: economia por caminhão x ciclos"
                ),
                scales: {
                    x: {
                        title: { display: true, text: "Ciclos de reutilização" }
                    },
                    y: {
                        ticks: {
                            callback: valor => formatarDinheiro(valor)
                        }
                    }
                }
            }
        }
    );
}



function atualizarLocais() {
    listaLocais.innerHTML = "<h2>Locais cadastrados</h2>";

    if (substituicoes.length === 0) {
        listaLocais.innerHTML +=
            "<p>Nenhuma substituição cadastrada.</p>";
        return;
    }

    substituicoes.forEach((item, indice) => {
        const economia = calcularEconomia(item);
        const equilibrio = ciclosEquilibrio(item);

        const linha = document.createElement("div");
        linha.className = "item-local";

        const nome = document.createElement("strong");
        nome.textContent = item.local;

        const detalhe = document.createElement("p");
        detalhe.textContent =
            "Produto convencional: " + item.nomeConvencional +
            " | Produto reutilizável: " + item.nomeReutilizavel +
            " | Quantidade: " + item.quantidade +
            " | Ciclos: " + item.ciclos +
            " | Economia por caminhão: " +
                formatarDinheiro(economia) +
            " | Mínimo para economia positiva: " +
                ciclosMinimosEconomia(item) + " ciclos";
           
        const alerta = document.createElement("p");

        if (item.ciclos <= equilibrio) {
            alerta.textContent =
                "Atenção: os ciclos informados ainda não geram economia positiva.";
        } else {
            alerta.hidden = true;
        }

        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.type = "button";

        const remover = document.createElement("button");
        remover.textContent = "Remover";
        remover.type = "button";

        const formulario = document.createElement("div");
        formulario.className = "form-edicao";
        formulario.hidden = true;

        formulario.innerHTML = `
            <h3>Editar substituição</h3>

            <label>Local de aplicação</label>
            <input class="edit-local" type="text">

            <label>Modelo convencional</label>
            <select class="edit-convencional"></select>

            <label>Modelo reutilizável</label>
            <select class="edit-reutilizavel"></select>

            <label>Quantidade por caminhão</label>
            <input class="edit-quantidade" type="number" min="1" step="1">

            <label>Ciclos estimados de reutilização</label>
            <input class="edit-ciclos" type="number" min="1" step="1">
        `;

        const campoLocal =
            formulario.querySelector(".edit-local");

        const campoConvencional =
            formulario.querySelector(".edit-convencional");

        const campoReutilizavel =
            formulario.querySelector(".edit-reutilizavel");

        const campoQuantidade =
            formulario.querySelector(".edit-quantidade");

        const campoCiclos =
            formulario.querySelector(".edit-ciclos");

        // Copiar as opções dos produtos do cadastro original
        seletores[0].querySelectorAll("option").forEach(opcao => {
            campoConvencional.appendChild(opcao.cloneNode(true));
        });

        seletores[1].querySelectorAll("option").forEach(opcao => {
            campoReutilizavel.appendChild(opcao.cloneNode(true));
        });

        // Preencher os dados atuais
        campoLocal.value = item.local;
        campoConvencional.value = item.nomeConvencional;
        campoReutilizavel.value = item.nomeReutilizavel;
        campoQuantidade.value = item.quantidade;
        campoCiclos.value = item.ciclos;

        const salvar = document.createElement("button");
        salvar.textContent = "Salvar alterações";
        salvar.type = "button";

        const cancelar = document.createElement("button");
        cancelar.textContent = "Cancelar";
        cancelar.type = "button";

        salvar.onclick = function () {
            const novoLocal = campoLocal.value.trim();
            const novaQuantidade = Number(campoQuantidade.value);
            const novosCiclos = Number(campoCiclos.value);

            const indiceConvencional =
                campoConvencional.selectedIndex - 1;

            const indiceReutilizavel =
                campoReutilizavel.selectedIndex - 1;

            if (
                !novoLocal ||
                !Number.isInteger(novaQuantidade) ||
                novaQuantidade <= 0 ||
                !Number.isInteger(novosCiclos) ||
                novosCiclos <= 0 ||
                indiceConvencional < 0 ||
                indiceReutilizavel < 0
            ) {
                alert("Preencha todos os campos corretamente.");
                return;
            }

            substituicoes[indice] = {
                ...item,
                local: novoLocal,
                quantidade: novaQuantidade,
                ciclos: novosCiclos,

                nomeConvencional:
                    campoConvencional.options[
                        campoConvencional.selectedIndex
                    ].text,

                nomeReutilizavel:
                    campoReutilizavel.options[
                        campoReutilizavel.selectedIndex
                    ].text,

                precoConvencional:
                    modelosConvencionais[indiceConvencional],

                precoReutilizavel:
                    modelosReutilizaveis[indiceReutilizavel]
            };

            atualizarPainel();
        };

        cancelar.onclick = function () {
            formulario.hidden = true;
            editar.hidden = false;
        };

        editar.onclick = function () {
            formulario.hidden = false;
            editar.hidden = true;
        };

        remover.onclick = function () {
            const confirmar = confirm(
                "Deseja realmente remover este cadastro?"
            );

            if (confirmar) {
                substituicoes.splice(indice, 1);
                atualizarPainel();
            }
        };

        formulario.append(salvar, cancelar);

        linha.append(
            nome,
            detalhe,
            alerta,
            editar,
            remover,
            formulario
        );

        listaLocais.appendChild(linha);
    });
}


// Adicionar substituição
botao.addEventListener("click", function () {
    const local = campos[0].value.trim();
    const quantidade = Number(campos[1].value);
    const ciclos = Number(campoCiclos.value);

    const modeloConvencional = seletores[0].selectedIndex - 1;
    const modeloReutilizavel = seletores[1].selectedIndex - 1;

    if (
        !local ||
        !Number.isInteger(quantidade) ||
        quantidade <= 0 ||
        !Number.isInteger(ciclos) ||
        ciclos <= 0 ||
        modeloConvencional < 0 ||
        modeloReutilizavel < 0
    ) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    const item = {
        local: local,
        quantidade: quantidade,
        ciclos: ciclos,
        nomeConvencional:
            seletores[0].options[modeloConvencional + 1].text,
        nomeReutilizavel:
            seletores[1].options[modeloReutilizavel + 1].text,
        precoConvencional:
            modelosConvencionais[modeloConvencional],
        precoReutilizavel:
            modelosReutilizaveis[modeloReutilizavel]
    };

    substituicoes.push(item);

    atualizarPainel();

    campos[0].value = "";
    campos[1].value = "";
    seletores[0].selectedIndex = 0;
    seletores[1].selectedIndex = 0;
    campoCiclos.value = 20;
});

// Validar e atualizar os parâmetros de produção
function validarProducao(campo, maximo = Infinity) {
    let valor = Number(campo.value);

    if (!Number.isFinite(valor) || valor < 0) {
        valor = 0;
    }

    valor = Math.floor(valor);

    if (valor > maximo) {
        valor = maximo;
    }

    campo.value = valor;

    return valor;
}

// Alterar produção diária
document.querySelector("#producao")
    .addEventListener("change", function () {
        producaoDiaria = validarProducao(this);
        atualizarPainel();
    });

// Alterar dias produtivos
document.querySelector("#diasMes")
    .addEventListener("change", function () {
        diasMes = validarProducao(this, 31);
        atualizarPainel();
    });

// Alterar meses produtivos
document.querySelector("#mesesAno")
    .addEventListener("change", function () {
        mesesAno = validarProducao(this, 12);
        atualizarPainel();
    });


// ----- Exportação CSV -----

// Texto seguro para CSV: aspas, separador e fórmulas de planilha
function csvTexto(valor) {
    let texto = String(valor ?? "");

    if (/^[=+\-@]/.test(texto)) {
        texto = "'" + texto;
    }

    if (/[;"\n]/.test(texto)) {
        texto = '"' + texto.replace(/"/g, '""') + '"';
    }

    return texto;
}

// Número no formato brasileiro (vírgula decimal)
function csvNumero(valor) {
    return valor.toFixed(2).replace(".", ",");
}

botaoExportar.addEventListener("click", function () {
    const linhas = [[
        "Local",
        "Produto convencional",
        "Produto reutilizável",
        "Quantidade",
        "Preço convencional",
        "Preço reutilizável",
        "Ciclos",
        "Investimento inicial",
        "Economia por caminhão"
    ]];

    substituicoes.forEach(item => {
        linhas.push([
            csvTexto(item.local),
            csvTexto(item.nomeConvencional || "-"),
            csvTexto(item.nomeReutilizavel || "-"),
            item.quantidade,
            csvNumero(item.precoConvencional),
            csvNumero(item.precoReutilizavel),
            item.ciclos,
            csvNumero(investimentoInicial(item)),
            csvNumero(calcularEconomia(item))
        ]);
    });

    const conteudo = linhas
        .map(linha => linha.join(";"))
        .join("\n");

    const arquivo = new Blob(
        ["\uFEFF" + conteudo],
        { type: "text/csv;charset=utf-8;" }
    );

    const link = document.createElement("a");
    link.href = URL.createObjectURL(arquivo);
    link.download = "relatorio-ecofix.csv";
    link.click();

    URL.revokeObjectURL(link.href);
});

// Atualizar todos os indicadores e informações do EcoFix
function atualizarPainel() {
    const economiaPorCaminhao = substituicoes.reduce(
        (total, item) => total + calcularEconomia(item),
        0
    );

    const economiaDiaria = economiaPorCaminhao * producaoDiaria;
    const economiaMensal = economiaDiaria * diasMes;
    const economiaAnual = economiaMensal * mesesAno;

    indicadores[0].textContent =
        formatarDinheiro(economiaPorCaminhao);

    indicadores[1].textContent =
        formatarDinheiro(economiaDiaria);

    indicadores[2].textContent =
        formatarDinheiro(economiaMensal);

    indicadores[3].textContent =
        formatarDinheiro(economiaAnual);

    salvarDados();
    atualizarLocais();
    atualizarAnalise();
    atualizarGraficos();
}

// Iniciar painel
atualizarPainel();
