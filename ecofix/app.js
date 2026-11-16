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
    <input id="producao" type="number" min="0" value="30">

    <label>Dias produtivos por mês</label>
    <input id="diasMes" type="number" min="0" max="31" value="22">

    <label>Meses produtivos por ano</label>
    <input id="mesesAno" type="number" min="0" max="12" value="12">
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

const opcoesBase = {
    responsive: true,
    animation: false,
    scales: {
        y: {
            ticks: {
                callback: valor => formatarDinheiro(valor)
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
                        backgroundColor: "#9e9e9e"
                    },
                    {
                        label: "Reutilizável (custo amortizado)",
                        data: substituicoes.map(item => custoAmortizado(item)),
                        backgroundColor: "#2e7d32"
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
        ["Conservador (50% dos ciclos)", 0.5, "#a5d6a7"],
        ["Informado (100% dos ciclos)", 1, "#2e7d32"],
        ["Otimista (150% dos ciclos)", 1.5, "#1b5e20"]
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
}

// Atualizar os indicadores
function atualizarPainel() {
    salvarDados();
    const economiaTotal = substituicoes.reduce(
        (total, item) => total + calcularEconomia(item),
        0
    );

    const economiaDiaria =
        economiaTotal * producaoDiaria;

    const economiaMensal =
        economiaDiaria * diasMes;

    const economiaAnual =
        economiaMensal * mesesAno;

    indicadores[0].textContent =
        formatarDinheiro(economiaTotal);

    indicadores[1].textContent =
        formatarDinheiro(economiaDiaria);

    indicadores[2].textContent =
        formatarDinheiro(economiaMensal);

    indicadores[3].textContent =
        formatarDinheiro(economiaAnual);

    atualizarLocais();
    atualizarAnalise();
    atualizarGraficos();
}

// Mostrar locais cadastrados

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
            "Quantidade: " + item.quantidade +
            " | Ciclos: " + item.ciclos +
            " | Equilíbrio: " + equilibrio.toFixed(1) + " ciclos" +
            " | Economia por caminhão: " +
            formatarDinheiro(economia);

        // Alerta quando a reutilizável não compensa
        const alerta = document.createElement("p");
        alerta.className = "alerta-ciclos";
        if (item.ciclos <= equilibrio) {
            alerta.textContent =
                "Atenção: com " + item.ciclos +
                " ciclos a reutilizável não gera economia.";
        } else {
            alerta.hidden = true;
        }

        // Botão editar
        const editar = document.createElement("button");
        editar.textContent = "Editar";
        editar.type = "button";

        // Formulário de edição
        const formulario = document.createElement("div");
        formulario.className = "form-edicao";
        formulario.hidden = true;

        formulario.innerHTML = `
            <h3>Editar substituição</h3>

            <label>Local de aplicação</label>
            <input class="edit-local" type="text">

            <label>Quantidade por caminhão</label>
            <input class="edit-quantidade" type="number" min="1">

            <label>Ciclos estimados de reutilização</label>
            <input class="edit-ciclos" type="number" min="1">
        `;

        const campoLocal =
            formulario.querySelector(".edit-local");

        const campoQuantidade =
            formulario.querySelector(".edit-quantidade");

        const campoCiclosEdicao =
            formulario.querySelector(".edit-ciclos");

        campoLocal.value = item.local;
        campoQuantidade.value = item.quantidade;
        campoCiclosEdicao.value = item.ciclos;

        // Botão salvar
        const salvar = document.createElement("button");
        salvar.textContent = "Salvar alterações";
        salvar.type = "button";

        salvar.onclick = function () {
            const novoLocal = campoLocal.value.trim();
            const novaQuantidade = Number(campoQuantidade.value);
            const novosCiclos = Number(campoCiclosEdicao.value);

            if (
                !novoLocal ||
                !Number.isInteger(novaQuantidade) ||
                novaQuantidade <= 0 ||
                !Number.isInteger(novosCiclos) ||
                novosCiclos <= 0
            ) {
                alert("Preencha os campos corretamente.");
                return;
            }

            substituicoes[indice] = {
                ...item,
                local: novoLocal,
                quantidade: novaQuantidade,
                ciclos: novosCiclos
            };

            atualizarPainel();
        };

        // Botão cancelar
        const cancelar = document.createElement("button");
        cancelar.textContent = "Cancelar";
        cancelar.type = "button";

        cancelar.onclick = function () {
            formulario.hidden = true;
            editar.hidden = false;
        };

        formulario.append(salvar, cancelar);

        editar.onclick = function () {
            formulario.hidden = false;
            editar.hidden = true;
        };

        // Botão remover
        const remover = document.createElement("button");
        remover.textContent = "Remover";
        remover.type = "button";

        remover.onclick = function () {
            const confirmar = confirm(
                "Deseja realmente remover este cadastro?"
            );

            if (confirmar) {
                substituicoes.splice(indice, 1);
                atualizarPainel();
            }
        };

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

// Alterar produção
document.querySelector("#producao")
    .addEventListener("input", function () {
        producaoDiaria = Math.max(0, Number(this.value) || 0);
        atualizarPainel();
    });

document.querySelector("#diasMes")
    .addEventListener("input", function () {
        diasMes = Math.max(0, Number(this.value) || 0);
        atualizarPainel();
    });

document.querySelector("#mesesAno")
    .addEventListener("input", function () {
        mesesAno = Math.max(0, Number(this.value) || 0);
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

// Iniciar painel
atualizarPainel();
